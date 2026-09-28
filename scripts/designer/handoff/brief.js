/**
 * Turns a hand-off report into the two things people read: `brief.md` for the
 * repository and a pull request, and `brief.jira.txt` in Jira wiki markup to
 * paste into a story. Both say the same things in the same order, in plain
 * English.
 */

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const WHY_PLACEHOLDER =
  '[Say what this change is and why it is needed, in one or two sentences.]'

/** `2026-09-27` to `27 September 2026`, the GOV.UK date style. */
export const longDate = (isoDate) => {
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${day} ${MONTHS[month - 1]} ${year}`
}

const showValue = (value) => {
  if (value === null || value === undefined) {
    return '(none)'
  }
  return String(value).replace(/\s+/g, ' ').trim()
}

const readable = (slug) => {
  const words = slug.split('-').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const pageName = (page) =>
  page.feature
    ? `${page.slugs.map(readable).join(', ')} (${page.slugs.join(', ')})`
    : 'Across the journey (flow, questions or shared parts)'

const madeFrom = (report) => {
  if (report.mode === 'real-journey') {
    return `The real journey (high-risk-plants), compared with ${report.baseRef.slice(0, 7)}.`
  }
  const steps = report.chain.map((hop) => hop.fromId)
  return `Design release ${report.set}, made from ${steps.join(', then ')}.`
}

const upstreamLine = (report) => {
  const check = report.upstreamApplyCheck
  if (!check) {
    return ' It was not checked against plants-frontend itself: the prototype had not fetched it (git fetch upstream).'
  }
  return check.ok
    ? ` It also applies cleanly to plants-frontend's ${check.ref}, as last fetched.`
    : ` It does not apply cleanly to plants-frontend's ${check.ref}, as last fetched: the real service has moved on since the prototype's last weekly update, so a developer will need to merge by hand.`
}

const applyLine = (report) => {
  if (report.applyCheck.empty) {
    return 'There is no patch: nothing in the real journey changes.'
  }
  const where = report.applyCheck.ok
    ? `The patch applies cleanly to the real journey as it is in the prototype (${report.applyRef === 'HEAD' ? 'this branch' : report.applyRef}).`
    : 'The patch does not apply cleanly to the real journey in the prototype. The real journey has moved on in the same places, so a developer will need to merge by hand (see "Has the real journey moved on?").'
  const services = report.cannotShip.services.length
    ? ' Applying cleanly is not the same as working: the files that use prototype-only services, and every file that imports them, are left out (see "What was left out and why"), so the real team must build those parts before the whole change works.'
    : ''
  return `${where}${upstreamLine(report)}${services}`
}

const recipeLine = (report) => {
  if (report.recipes.length) {
    return `This change followed: ${report.recipes.join(', ')} (in the set's docs folder).`
  }
  return report.wordsOnly
    ? 'Words only (change-the-words): every changed file is a copy file, so no recipe applies.'
    : 'No recipe named. The change is to layout only, or the commit messages do not name one.'
}

/**
 * The pictures for one group of changes. A change across the journey (the
 * flow, section captions, shared copy) has no page of its own, so it takes
 * every picture no other group claims.
 */
const shotsFor = (page, shots, pages) => {
  if (page.feature) {
    return shots.filter((shot) => page.slugs.includes(shot.slug))
  }
  const claimed = new Set(
    pages.filter((other) => other.feature).flatMap((other) => other.slugs)
  )
  return shots.filter((shot) => !claimed.has(shot.slug))
}

const WELSH_MARKER = '[Welsh needed]'

/**
 * The content of the brief as a list of blocks, so the Markdown and Jira
 * renderers share one outline. Each block is `{ kind, ... }`.
 */
export const briefOutline = (report, meta) => {
  const blocks = []
  const add = (kind, fields) => blocks.push({ kind, ...fields })
  const shots = meta.screenshots ?? []

  add('title', { text: meta.title })
  add('para', {
    text: `Hand-off from the plants prototype, ${longDate(meta.date)}. ${madeFrom(report)}`
  })
  add('heading', { text: 'What and why' })
  add('para', { text: meta.why || WHY_PLACEHOLDER })

  add('heading', { text: 'Pages changed' })
  if (report.pages.length === 0) {
    add('para', { text: 'No page files changed.' })
  }
  for (const page of report.pages) {
    add('subheading', { text: pageName(page) })
    add('list', {
      items: page.files.map((file) => `${file.status}: {{${file.path}}}`)
    })
    for (const shot of shotsFor(page, shots, report.pages)) {
      add('image', {
        alt: `${page.feature ?? shot.slug}: ${shot.state}`,
        file: shot.fileName
      })
    }
    const english = page.copy.filter((row) => row.language === 'en')
    if (english.length) {
      add('table', {
        header: ['Key', 'Old English', 'New English'],
        rows: english.map((row) => [
          `{{${row.key}}}`,
          showValue(row.before),
          showValue(row.after)
        ])
      })
    }
    const welshToTranslate = page.copy.filter(
      (row) =>
        row.language === 'cy' && String(row.after ?? '').includes(WELSH_MARKER)
    )
    if (welshToTranslate.length) {
      add('table', {
        header: ['Key', 'Old Welsh', 'New English, to translate'],
        rows: welshToTranslate.map((row) => [
          `{{${row.key}}}`,
          showValue(row.before),
          showValue(String(row.after).replace(WELSH_MARKER, '').trim())
        ])
      })
    }
  }

  add('heading', { text: 'Welsh needed' })
  const welsh = report.cannotShip.welshNeeded
  add(
    welsh.length ? 'list' : 'para',
    welsh.length
      ? {
          items: welsh.map(
            (marker) =>
              `{{${marker.file}}} line ${marker.line} (once the patch is applied): "${marker.english}"`
          )
        }
      : { text: 'None. Every changed Welsh string has a translation.' }
  )
  if (welsh.length) {
    add('para', {
      text: 'These lines say [Welsh needed] followed by the English. They need a translation before they go live. The tables under "Pages changed" show the Welsh each one replaced, for the translator.'
    })
  }

  add('heading', { text: 'Tests that pin the old words' })
  add(
    report.testImpact.length ? 'list' : 'para',
    report.testImpact.length
      ? {
          items: report.testImpact.map(
            (hit) => `{{${hit.file}}} line ${hit.line}: "${hit.text}"`
          )
        }
      : {
          text: 'None found. No test or browser spec checks for the old words.'
        }
  )
  if (report.testImpact.length) {
    add('para', {
      text: 'Each of these tests still expects the old words. Update them in the same pull request as the patch.'
    })
  }

  const spec = report.specImpact ?? []
  add('heading', {
    text: 'Spec and requirement files that quote the old words'
  })
  add(
    spec.length ? 'list' : 'para',
    spec.length
      ? {
          items: spec.map(
            (hit) => `{{${hit.file}}} line ${hit.line}: "${hit.text}"`
          )
        }
      : {
          text: 'None found. No requirement file under the real journey’s spec folder quotes the old words.'
        }
  )
  if (spec.length) {
    add('para', {
      text: 'These requirement files still say the old words. Update them with the patch, or the journey spec and the pages will disagree.'
    })
  }

  addCannotShip(add, report)

  add('heading', { text: 'Recipe used' })
  add('para', { text: recipeLine(report) })

  add('heading', { text: 'What was left out and why' })
  const leftOut = [
    ...report.leftOut.map((item) => `{{${item.path}}}: ${item.reason}`),
    ...(meta.skippedScreenshots ?? []).map(
      (shot) =>
        `Screenshot ${shot.relative}: left out to keep the folder under 2 MB.`
    )
  ]
  add(
    leftOut.length ? 'list' : 'para',
    leftOut.length ? { items: leftOut } : { text: 'Nothing was left out.' }
  )

  addDrift(add, report)
  addHowToApply(add, report, meta)
  return blocks
}

const exampleSentence = (service) =>
  service.shape?.example
    ? ` Its example data (from ${service.shape.file}) is a starting point for the API conversation: ${JSON.stringify(service.shape.example)}`
    : ''

const addCannotShip = (add, report) => {
  const { services, designGaps, researchRules, welshNeeded } = report.cannotShip
  add('heading', { text: 'What cannot ship as it is' })
  const items = [
    ...services.map(
      (service) =>
        `{{${service.file}}} uses "${service.name}" (${service.kind}), which only exists in the prototype: it needs a real service.${service.shape?.needs ? ` What it stands in for: ${service.shape.needs}` : ''}${exampleSentence(service)}`
    ),
    ...(welshNeeded.length
      ? [`${welshNeeded.length} Welsh string(s) still need translating.`]
      : []),
    ...designGaps.map(
      (gap) =>
        `Design gap: ${Object.entries(gap)
          .filter(([, value]) => value)
          .map(([name, value]) =>
            name === 'gap' ? value : `${name}: ${value}`
          )
          .join('; ')}`
    ),
    ...researchRules.map(
      (rule) => `Research mode only (turn back on before shipping): ${rule}`
    )
  ]
  add(
    items.length ? 'list' : 'para',
    items.length
      ? { items }
      : {
          text: 'Nothing. No pretend services, Welsh gaps, design gaps or research-mode rules.'
        }
  )
}

const addDrift = (add, report) => {
  add('heading', { text: 'Has the real journey moved on?' })
  const { drift } = report
  if (report.mode === 'real-journey') {
    add('para', {
      text: 'This change was made on the real journey directly, so there is no release to drift from.'
    })
    return
  }
  if (!drift.ref) {
    add('para', {
      text: 'Not known: the release has not been saved yet, so there is no starting point to compare with.'
    })
    return
  }
  if (!drift.overlapping.length && !drift.elsewhere.length) {
    add('para', {
      text: 'No. The real journey has not changed since this release was made.'
    })
    return
  }
  if (drift.overlapping.length) {
    add('para', {
      text: 'Yes, in files this change also touches. The team will need to merge these by hand:'
    })
    add('list', { items: drift.overlapping.map((file) => `{{${file}}}`) })
  }
  if (drift.elsewhere.length) {
    add('para', {
      text: `The real journey also changed in ${drift.elsewhere.length} other file(s). They do not affect this patch.`
    })
  }
}

const addHowToApply = (add, report, meta) => {
  add('heading', { text: 'How to apply' })
  add('para', { text: applyLine(report) })
  add('para', {
    text: 'This change can reach the real service in one of two ways:'
  })
  add('list', {
    items: [
      'Give this brief and upstream.patch to the plants-frontend team. They raise a story from it (paste brief.jira.txt) and make the change.',
      `A developer applies the patch in a clone of trade-imports-plants-frontend: {{git switch -c ${meta.branch}}}, then {{git apply --3way upstream.patch}}, then updates the tests listed above, runs {{npm test}} and raises a pull request.`
    ]
  })
  add('para', {
    text: 'The prototype never pushes to plants-frontend. Once the real team merges the change, the weekly update brings it back into the prototype.'
  })
}

const escapeMarkdownCell = (text) => text.replace(/\|/g, '\\|')

const toMarkdownInline = (text) => text.replace(/\{\{(.+?)\}\}/g, '`$1`')

/** The brief as Markdown. */
export const renderBriefMarkdown = (blocks) =>
  blocks
    .map((block) => {
      switch (block.kind) {
        case 'title':
          return `# ${block.text}`
        case 'heading':
          return `## ${block.text}`
        case 'subheading':
          return `### ${block.text}`
        case 'list':
          return block.items
            .map((item) => `- ${toMarkdownInline(item)}`)
            .join('\n')
        case 'image':
          return `![${block.alt}](screenshots/${block.file})`
        case 'table':
          return [
            `| ${block.header.join(' | ')} |`,
            `| ${block.header.map(() => '---').join(' | ')} |`,
            ...block.rows.map(
              (row) =>
                `| ${row.map((cell) => escapeMarkdownCell(toMarkdownInline(cell))).join(' | ')} |`
            )
          ].join('\n')
        default:
          return toMarkdownInline(block.text)
      }
    })
    .join('\n\n') + '\n'

const escapeJira = (text) =>
  text
    .split(/(\{\{.+?\}\})/g)
    .map((part) =>
      part.startsWith('{{') && part.endsWith('}}')
        ? `{{${part.slice(2, -2).replace(/([{}[\]|])/g, '\\$1')}}}`
        : part.replace(/([{}[\]|*_])/g, '\\$1')
    )
    .join('')

/** The brief in Jira wiki markup, ready to paste into a story. */
export const renderBriefJira = (blocks) =>
  blocks
    .map((block) => {
      switch (block.kind) {
        case 'title':
          return `h1. ${escapeJira(block.text)}`
        case 'heading':
          return `h2. ${escapeJira(block.text)}`
        case 'subheading':
          return `h3. ${escapeJira(block.text)}`
        case 'list':
          return block.items.map((item) => `* ${escapeJira(item)}`).join('\n')
        case 'image':
          return `!${block.file}|thumbnail! (attach screenshots/${block.file})`
        case 'table':
          return [
            `||${block.header.map(escapeJira).join('||')}||`,
            ...block.rows.map((row) => `|${row.map(escapeJira).join('|')}|`)
          ].join('\n')
        default:
          return escapeJira(block.text)
      }
    })
    .join('\n\n') + '\n'
