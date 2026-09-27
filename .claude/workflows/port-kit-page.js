export const meta = {
  name: 'port-kit-page',
  description:
    'Re-create one old Prototype Kit page in a design release with real GOV.UK components, then check it, show it and grade how closely it matches',
  whenToUse:
    'From the port-a-kit-page skill. Launch by scriptPath with args {set, source, sourceKind, slug, after, reference}; every key is required.',
  phases: [
    { title: 'Preflight', detail: 'the release is yours and not frozen' },
    { title: 'Inventory', detail: 'what the old page holds, as JSON' },
    { title: 'Build', detail: 'template, copy and registration' },
    { title: 'Check', detail: 'designer:check --full, up to 3 repairs' },
    { title: 'Show', detail: 'designer:show with the original as reference' },
    { title: 'Fidelity', detail: 'matched, nearest or design gap, row by row' }
  ]
}

/* global agent, args, log, phase */

// The one place to choose models. `runner` only runs commands and reports,
// `builder` edits files, `judge` reads, plans and grades. Point any of them at
// another model (for example Fable) here; null means "use the session model".
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }

// >>> args-contract
const parseArgs = (workflowName, rawArgs) => {
  if (typeof rawArgs !== 'string') return rawArgs
  try {
    return JSON.parse(rawArgs)
  } catch (error) {
    throw new Error(
      `${workflowName}: args arrived as a string that is not JSON (${error.message})`
    )
  }
}

const missingKeys = (config, keys) =>
  keys.filter(
    (key) =>
      config === null ||
      typeof config !== 'object' ||
      Array.isArray(config) ||
      config[key] === undefined
  )

const requireKeys = (workflowName, config, keys) => {
  const missing = missingKeys(config, keys)
  if (missing.length === 0) return
  const noun = missing.length === 1 ? 'key' : 'keys'
  throw new Error(
    `${workflowName}: args is missing required ${noun} ${missing.join(', ')}. Pass every one in args: this workflow has no defaults`
  )
}

const logResolvedConfig = (workflowName, config) =>
  log(`${workflowName}: resolved configuration ${JSON.stringify(config)}`)
// <<< args-contract

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = [
  'set',
  'source',
  'sourceKind',
  'slug',
  'after',
  'reference'
]
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

const SOURCE_KINDS = ['html', 'url', 'screenshot']
const NOT_RELEASES = ['high-risk-plants', 'sample-journey']
const SET_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/
const MAX_REPAIRS = 3

const refuse = (reason) => {
  throw new Error(`${WORKFLOW_NAME}: ${reason}`)
}

if (!SOURCE_KINDS.includes(config.sourceKind)) {
  refuse(`sourceKind must be one of ${SOURCE_KINDS.join(', ')}`)
}
if (!SET_ID.test(config.set)) {
  refuse(`set must be a set id such as plants-working, not "${config.set}"`)
}
if (NOT_RELEASES.includes(config.set)) {
  refuse(
    `${config.set} is not a design release. Port the page into a working release instead (the design-release skill makes one)`
  )
}
if (!SLUG.test(config.slug)) {
  refuse(
    `slug must be lower-case words joined by hyphens, not "${config.slug}"`
  )
}
if (config.reference !== null && typeof config.reference !== 'string') {
  refuse('reference must be an image path or null')
}

const SET_DIR = `src/server/app/sets/${config.set}`
const WORK_DIR = `.cache/designer/port/${config.set}/${config.slug}`
const screenshotSource =
  config.sourceKind === 'screenshot' ? config.source : null
const REFERENCE = config.reference ?? screenshotSource

const GUARD_RAILS = [
  'GUARD RAILS:',
  '- Run one Bash command per call: no &&, ;, | or cd.',
  `- Change files only under ${SET_DIR}/ and src/server/app/routes-${config.set}.js, plus files under ${WORK_DIR}/ and ${SET_DIR}/design-gaps.md when told to.`,
  '- Never change *.scss, src/client/**, webpack.config.js, src/server/app/shared/** or any other set.',
  '- Never add *.test.js or *.fit.spec.js files to a design release.',
  '- Never run git add, git commit, git push, git stash or git reset.',
  '- Follow .claude/rules/templates.md for every template.'
].join('\n')

const PREFLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    reason: { type: 'string' }
  },
  required: ['ok', 'reason']
}

const INVENTORY_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    pageKind: { enum: ['static', 'data-collecting', 'list'] },
    headings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          level: { type: 'integer' },
          text: { type: 'string' },
          classes: { type: 'string' }
        },
        required: ['level', 'text']
      }
    },
    components: { type: 'array', items: { type: 'string' } },
    strings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['role', 'text']
      }
    },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          label: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          errorMessage: { type: 'string' }
        },
        required: ['name', 'type', 'label']
      }
    },
    reveals: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          when: { type: 'string' },
          shows: { type: 'array', items: { type: 'string' } }
        },
        required: ['when', 'shows']
      }
    },
    appClasses: { type: 'array', items: { type: 'string' } },
    links: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          href: { type: 'string' }
        },
        required: ['text', 'href']
      }
    },
    scripts: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } }
  },
  required: [
    'title',
    'pageKind',
    'headings',
    'components',
    'strings',
    'fields',
    'reveals',
    'appClasses',
    'links',
    'scripts',
    'notes'
  ]
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    built: { type: 'boolean' },
    recipe: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    leftOut: { type: 'array', items: { type: 'string' } },
    notes: { type: 'string' }
  },
  required: ['built', 'recipe', 'filesChanged', 'leftOut', 'notes']
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    logPath: { type: 'string' }
  },
  required: ['passed', 'summary', 'logPath']
}

const SHOW_SCHEMA = {
  type: 'object',
  properties: {
    ran: { type: 'boolean' },
    galleryPath: { type: 'string' },
    screenshots: { type: 'array', items: { type: 'string' } },
    axeFindings: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['ran', 'galleryPath', 'screenshots', 'axeFindings', 'summary']
}

const FIDELITY_SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          built: { type: 'string' },
          verdict: { enum: ['matched', 'nearest', 'gap'] },
          why: { type: 'string' }
        },
        required: ['original', 'built', 'verdict', 'why']
      }
    },
    gapRows: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['rows', 'gapRows', 'summary']
}

const withModel = (tier, opts) =>
  MODELS[tier] ? { ...opts, model: MODELS[tier] } : opts

const sourceInstructions = () => {
  if (config.sourceKind === 'html') {
    return `Read the Prototype Kit page at ${config.source} with the Read tool.`
  }
  if (config.sourceKind === 'url') {
    return `Fetch the page at ${config.source} with WebFetch and work from its HTML. If it asks for a password, redirects to a sign-in page or fails, stop: say so in notes and return pageKind "static" with empty lists.`
  }
  return `Open the screenshot at ${config.source} with the Read tool and work from what you can see. Record classes and field names as unknown where the picture cannot show them.`
}

const fenced = (value) =>
  `\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n`

const preflight = () =>
  agent(
    [
      `Check that a page can be ported into the design release "${config.set}".`,
      `1. Run: npm run designer:where -- ${SET_DIR}/set.js`,
      '   ok is false if the answer does not start with "Yours", or says the release is frozen, or the set does not exist.',
      config.sourceKind === 'url'
        ? '2. The source is a web address: nothing to check.'
        : `2. Run: ls ${config.source}   (ok is false if it does not exist)`,
      `3. Run: grep -rn "slug: '${config.after}'" ${SET_DIR}/journeys/linear/features`,
      `   ok is false if no page in the release has the slug "${config.after}".`,
      `4. Run: grep -rn "slug: '${config.slug}'" ${SET_DIR}/journeys/linear/features`,
      `   ok is false if a page with the slug "${config.slug}" already exists.`,
      'Return ok and, in reason, one plain sentence a designer understands.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'preflight',
      phase: 'Preflight',
      schema: PREFLIGHT_SCHEMA
    })
  )

const takeInventory = () =>
  agent(
    [
      'Take an inventory of an old GOV.UK Prototype Kit page, so it can be rebuilt with real GOV.UK components.',
      sourceInstructions(),
      'Record, from the page itself:',
      '- title: the main heading text',
      '- pageKind: "static" (no form, or only a button), "data-collecting" (a form that saves answers) or "list" (shows records from a list or lookup, often with search, a table or cards)',
      '- headings: every heading, its level and its classes',
      '- components: every GOV.UK component or hand-written equivalent (say "hand-written" when it is not the macro)',
      '- strings: every visible string with its role (heading, caption, body, hint, label, legend, option, button, link, warning, error)',
      '- fields: every form field: name, type, label, options as "value: text (hint)", and its error message if the page shows one',
      '- reveals: every conditional reveal, as "field = value" and the fields it shows',
      '- appClasses: every class starting with app-',
      '- links: every link text and href',
      '- scripts: every data-module or script the page depends on',
      '- notes: anything the page gets from outside itself (option lists from routes.js or app/data, session data, Kit routes that branch)',
      `Then write the same JSON to ${WORK_DIR}/inventory.json (create the folder with mkdir -p first). Change nothing else.`,
      GUARD_RAILS
    ].join('\n'),
    withModel('judge', {
      label: 'inventory',
      phase: 'Inventory',
      schema: INVENTORY_SCHEMA
    })
  )

const RECIPES = {
  static:
    "change-the-journey's guidance-page recipe (docs/designers/recipes/guidance-page.md)",
  'data-collecting':
    "change-the-journey's add-a-page recipe, which follows add-a-field for each answer (src/server/app/sets/high-risk-plants/docs/add-a-page.md, in release mode)",
  list: 'fake-a-service for the data (.claude/skills/fake-a-service/SKILL.md), then change-the-journey to place the page'
}

const build = (inventory) =>
  agent(
    [
      `Build the page "${inventory.title}" in the design release "${config.set}" from this inventory of an old Prototype Kit page:`,
      fenced(inventory),
      `The new page's slug is "${config.slug}". It comes straight after the page "${config.after}" in the release's flow.`,
      `Its kind is "${inventory.pageKind}", so register it with ${RECIPES[inventory.pageKind]}.`,
      'Read first, in this order:',
      '1. .claude/skills/port-a-kit-page/references/kit-to-prototype.md (how Kit habits map to this prototype)',
      '2. .claude/skills/change-the-journey/SKILL.md, and for a list page .claude/skills/fake-a-service/SKILL.md. Follow the recipe they route to, in release mode: skip every step that creates a *.test.js or *.fit.spec.js file.',
      '3. .claude/rules/templates.md and .claude/skills/match-the-design/references/components-we-have.md',
      'Rules for this port:',
      '- Use GOV.UK macros for everything; hand-written Kit markup becomes the matching macro.',
      "- Every visible string goes in the feature's copy/copy.en.js, word for word, and the same key in copy/copy.cy.js as '[Welsh needed] <English>'.",
      '- Drop every app-* class and custom script. List each dropped thing in leftOut.',
      "- If a required answer is added, add it to the release's journeys/linear/flow/fixtures/happy-path.json so the examples still reach the end.",
      '- Do not run the checks: the next step does.',
      'Return what you built, the recipe you followed, every file you changed, and what you left out.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: 'build',
      phase: 'Build',
      schema: BUILD_SCHEMA
    })
  )

const check = (attempt) =>
  agent(
    [
      `Run: npm run designer:check -- --set ${config.set} --full`,
      'Report whether it passed, the plain-English summary it prints (the failing rows in full), and the log path it prints.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: `check ${attempt}`,
      phase: 'Check',
      schema: CHECK_SCHEMA
    })
  )

const repair = (failure, attempt) =>
  agent(
    [
      `The check of the design release "${config.set}" failed after the page "${config.slug}" was added.`,
      `Summary: ${failure.summary}`,
      `Full log: ${failure.logPath} (read it).`,
      'Fix the cause in the files the port created or changed. Fix only what the port caused. If the failure is in a file the port did not touch, change nothing and say so in notes.',
      'Return what you changed.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: `repair ${attempt}`,
      phase: 'Check',
      schema: BUILD_SCHEMA
    })
  )

const checkWithRepairs = async () => {
  let result = await check(1)
  for (
    let attempt = 1;
    attempt <= MAX_REPAIRS && result && !result.passed;
    attempt++
  ) {
    log(
      `Check failed (${result.summary}). Repair ${attempt} of ${MAX_REPAIRS}.`
    )
    await repair(result, attempt)
    result = await check(attempt + 1)
  }
  return result
}

const show = () => {
  const reference = REFERENCE ? ` --reference ${config.slug}=${REFERENCE}` : ''
  return agent(
    [
      `Run: npm run designer:show -- --set ${config.set} --pages ${config.slug}${reference}`,
      'Report the gallery folder it prints, the screenshot files in it for this page, and every accessibility finding in its axe.json for this page, each in one plain sentence.',
      'If the page could not be reached, say which page the example stopped at.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label: 'show', phase: 'Show', schema: SHOW_SCHEMA })
  )
}

const gradeFidelity = (inventory, built, shown) =>
  agent(
    [
      'Grade how closely a page rebuilt in this prototype matches the old Prototype Kit page it came from.',
      'The inventory of the old page:',
      fenced(inventory),
      `What the build step made: ${JSON.stringify(built)}`,
      `The gallery: ${shown?.galleryPath ?? 'none'}. Open the screenshots of the new page (${(shown?.screenshots ?? []).join(', ') || 'none'}) and look at them.`,
      `The old page is ${config.source} (${config.sourceKind}). Read it with the Read tool, or fetch it with WebFetch if it is a web address, and compare.`,
      `Also read the new page's template and copy files under ${SET_DIR}/journeys/linear/features/.`,
      'Make one row per thing in the old page (heading, caption, each component, each field, each reveal, each link, the app-* classes, the page width and chrome):',
      '- original: what the old page had',
      '- built: what the new page has',
      '- verdict: "matched" (same thing with a GOV.UK macro or class), "nearest" (the nearest GOV.UK option, visibly different) or "gap" (nothing could be built)',
      '- why: one plain sentence',
      'Use .claude/skills/match-the-design/references/nearest-equivalent.md to judge what the nearest option is.',
      `Then, for every "nearest" and "gap" row whose difference would show on screen, write one gap row in the exact format of .claude/skills/match-the-design/references/design-gaps.md, with Page "${config.slug}" and Frame "${config.source}". Return them in gapRows as whole markdown table lines.`,
      'Change nothing.'
    ].join('\n'),
    withModel('judge', {
      label: 'fidelity',
      phase: 'Fidelity',
      schema: FIDELITY_SCHEMA
    })
  )

const fidelityTable = (rows) =>
  [
    '| # | In the old page | In the prototype | Verdict | Why |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map(
      (row, index) =>
        `| ${index + 1} | ${row.original} | ${row.built} | ${row.verdict} | ${row.why} |`
    )
  ].join('\n')

const writeRecords = (graded, table) =>
  agent(
    [
      `1. Write this text, exactly, to ${WORK_DIR}/fidelity.md:`,
      '<<<',
      `# Fidelity: ${config.slug} in ${config.set}`,
      '',
      graded.summary,
      '',
      table,
      '>>>',
      graded.gapRows.length === 0
        ? '2. There are no design gap rows. Do not touch design-gaps.md.'
        : [
            `2. Append these rows, exactly, to ${SET_DIR}/design-gaps.md. If the file does not exist, first create it with the heading and table header given in .claude/skills/match-the-design/references/design-gaps.md.`,
            '<<<',
            ...graded.gapRows,
            '>>>'
          ].join('\n'),
      'Change nothing else. Reply with the word done.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label: 'write records', phase: 'Fidelity' })
  )

const main = async () => {
  phase('Preflight')
  const ready = await preflight()
  if (!ready?.ok) {
    log(
      `Stopped before any change: ${ready?.reason ?? 'the preflight did not answer'}`
    )
    return
  }

  phase('Inventory')
  const inventory = await takeInventory()
  if (!inventory) {
    log('Stopped: the inventory step did not answer. Nothing was changed.')
    return
  }
  log(
    `Inventory: a ${inventory.pageKind} page, ${inventory.fields.length} fields, ${inventory.appClasses.length} app-* classes.`
  )

  phase('Build')
  const built = await build(inventory)
  if (!built?.built) {
    log(`Stopped: the page was not built. ${built?.notes ?? ''}`)
    return
  }
  log(`Built with ${built.recipe}: ${built.filesChanged.join(', ')}`)

  phase('Check')
  const checked = await checkWithRepairs()
  if (!checked?.passed) {
    log(
      `Parked: the release still fails its check after ${MAX_REPAIRS} repairs. ${checked?.summary ?? ''} The changed files are left in place for you to look at: ${built.filesChanged.join(', ')}`
    )
    return
  }

  phase('Show')
  const shown = await show()
  log(`Gallery: ${shown?.galleryPath ?? 'not made'}`)

  phase('Fidelity')
  const graded = await gradeFidelity(inventory, built, shown)
  if (!graded) {
    log('The fidelity review did not answer. The page is built and checked.')
    return
  }
  const table = fidelityTable(graded.rows)
  await writeRecords(graded, table)
  log(
    [
      `${config.slug} is built in ${config.set} and passes its check.`,
      graded.summary,
      table,
      `Written to ${WORK_DIR}/fidelity.md. Design gaps logged: ${graded.gapRows.length}.`,
      `Accessibility: ${(shown?.axeFindings ?? []).join(' ') || 'no findings reported'}`
    ].join('\n')
  )
}

await main()
