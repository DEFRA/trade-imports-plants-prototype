/**
 * The parts of the hand-off that make it a story a developer (or an agent)
 * can build from: the acceptance criteria, the tests to add, the recipe to
 * follow, and the links to see the prototype running. Pure functions: the
 * CLI reads the files and passes them in.
 */

/** Words that only ever stand in for the designer's own. */
export const STORY_PLACEHOLDERS = Object.freeze({
  as: '[Who is this for? In the designer’s own words.]',
  want: '[What do they need to do? In the designer’s own words.]',
  soThat: '[Why do they need it? In the designer’s own words.]',
  why: '[Say what this change is and why it is needed, in one or two sentences.]',
  criteria: {
    title: null,
    steps: [
      { keyword: 'Given', text: '[where the user starts]' },
      { keyword: 'When', text: '[what they do]' },
      { keyword: 'Then', text: '[what they see or what happens]' }
    ],
    placeholder: true
  }
})

const KEYWORDS = ['Given', 'When', 'Then', 'And', 'But']
const KEYWORD_LINE = /^(given|when|then|and|but)\b\s*(.*)$/i
const TITLE_LINE = /^scenario:\s*(.*)$/i

/** A problem with the designer's criteria file, in plain words. */
export class CriteriaError extends Error {}

const keywordOf = (word) =>
  KEYWORDS.find((keyword) => keyword.toLowerCase() === word.toLowerCase())

const checkScenario = (scenario, number) => {
  const keywords = scenario.steps.map((step) => step.keyword)
  if (!keywords.includes('Then')) {
    throw new CriteriaError(
      `Acceptance criterion ${number} has no "Then" line. Each one needs Given, When and Then.`
    )
  }
  if (!keywords.includes('Given') && !keywords.includes('When')) {
    throw new CriteriaError(
      `Acceptance criterion ${number} needs a "Given" or a "When" line before its "Then".`
    )
  }
}

/**
 * Reads acceptance criteria written as plain Given/When/Then lines. Each
 * criterion is a block of lines; a blank line starts the next one. A block
 * may start with "Scenario: <title>". Lines starting with # are notes and are
 * skipped.
 *
 * @param {string} text - the criteria file.
 * @returns {{ title: string|null, steps: { keyword: string, text: string }[] }[]}
 * @throws {CriteriaError} for a line that is not Given, When, Then, And or
 * But, or a block without Then.
 */
export const parseCriteria = (text) => {
  const scenarios = []
  let current = null
  const lines = String(text).split('\n')
  lines.forEach((raw, index) => {
    const line = raw.trim()
    if (line === '' || line.startsWith('#')) {
      if (line === '') {
        current = null
      }
      return
    }
    if (!current) {
      current = { title: null, steps: [] }
      scenarios.push(current)
    }
    const title = TITLE_LINE.exec(line)
    if (title && current.steps.length === 0) {
      current.title = title[1].trim() || null
      return
    }
    const step = KEYWORD_LINE.exec(line)
    if (!step) {
      throw new CriteriaError(
        `Line ${index + 1} of the criteria file does not start with Given, When, Then, And or But: "${line}"`
      )
    }
    current.steps.push({ keyword: keywordOf(step[1]), text: step[2].trim() })
  })
  if (scenarios.length === 0) {
    throw new CriteriaError(
      'The criteria file has no acceptance criteria in it. Write at least one Given, When, Then.'
    )
  }
  scenarios.forEach((scenario, index) => checkScenario(scenario, index + 1))
  return scenarios
}

const quote = (value) => `"${String(value).replace(/\s+/g, ' ').trim()}"`

/**
 * Acceptance criteria for a change of words only, one per changed English
 * string, plus one for the Welsh when Welsh strings changed. They say only
 * what the copy files say, so they are safe to generate.
 *
 * @param {object[]} pages - the report's pages, each with `copy` rows.
 * @param {(page: object) => string} nameOf - the page's name in the brief.
 */
export const copyCriteria = (pages, nameOf) => {
  const scenarios = []
  for (const page of pages) {
    const where = page.feature
      ? `I am on the ${nameOf(page)} page`
      : 'I am on a page that shows these words'
    for (const row of page.copy.filter((item) => item.language === 'en')) {
      scenarios.push({
        title: null,
        steps: [
          { keyword: 'Given', text: where },
          {
            keyword: 'When',
            text: `the page shows the words for {{${row.key}}}`
          },
          {
            keyword: 'Then',
            text:
              row.after === null
                ? 'those words are no longer shown'
                : `they read ${quote(row.after)}`
          }
        ]
      })
    }
    if (page.copy.some((item) => item.language === 'cy')) {
      scenarios.push({
        title: null,
        steps: [
          { keyword: 'Given', text: `${where}, in Welsh` },
          { keyword: 'When', text: 'the page shows the changed words' },
          {
            keyword: 'Then',
            text: 'they are in Welsh, with no [Welsh needed] marker left'
          }
        ]
      })
    }
  }
  return scenarios
}

const REAL = 'src/server/app/sets/high-risk-plants'
const FEATURES = `${REAL}/journeys/linear/features`

/** The plants-frontend recipes, under the real journey's docs folder. */
export const REAL_RECIPES = Object.freeze([
  'add-a-field',
  'add-a-page',
  'add-a-section',
  'add-a-collection',
  'journey-flow-and-gates',
  'obligation-model'
])

export const TESTING_GUIDE = `${REAL}/docs/testing.md`
export const SERVICES_GUIDE = 'src/server/app/docs/services.md'

/**
 * Where a recipe is written down: plants-frontend's own recipe docs, or the
 * prototype's designer recipes for the ones only the prototype has.
 */
export const recipeDocPath = (recipe) =>
  REAL_RECIPES.includes(recipe)
    ? { repo: 'plants-frontend', path: `${REAL}/docs/${recipe}.md` }
    : { repo: 'plants-prototype', path: `docs/designers/recipes/${recipe}.md` }

/**
 * Whether the change moves a page or changes a gate. A flow row that only
 * holds a changed page, in the same order as before, is not a move.
 */
export const changesFlow = (report) =>
  (report.gateChanges ?? []).length > 0 ||
  (report.journeyFlow?.rows ?? []).some((row) => row.moved !== false)

const isNewPage = (page) =>
  page.feature &&
  page.files.some(
    (file) =>
      file.status === 'added' && /\/(page|controller)\.js$/.test(file.path)
  )

/**
 * The recipes the change followed, named or worked out from it: a new page is
 * add-a-page, a gate or order change is journey-flow-and-gates, a new error on
 * an existing page is add-a-field.
 */
export const recipesFor = (report) => {
  const named = report.recipes ?? []
  const inferred = []
  if (report.pages.some(isNewPage)) {
    inferred.push('add-a-page')
  }
  const newErrors = report.pages.some(
    (page) =>
      !isNewPage(page) &&
      page.copy.some(
        (row) =>
          row.language === 'en' &&
          row.before === null &&
          /^errors\./.test(row.key)
      )
  )
  if (newErrors) {
    inferred.push('add-a-field')
  }
  if (changesFlow(report)) {
    inferred.push('journey-flow-and-gates')
  }
  return {
    named,
    inferred: inferred.filter((recipe) => !named.includes(recipe))
  }
}

const featurePath = (page) => `${FEATURES}/${page.feature}`

/**
 * The tests the real team adds, from what the change adds: pages, fields
 * and validation rules, services, and flow. Each item is one line.
 */
export const testsToAdd = (report) => {
  const items = []
  const validationByPage = new Map()
  for (const row of report.validation ?? []) {
    validationByPage.set(row.page, (validationByPage.get(row.page) ?? 0) + 1)
  }
  for (const page of report.pages.filter((item) => item.feature)) {
    const dir = featurePath(page)
    const rules = validationByPage.get(page.feature) ?? 0
    if (isNewPage(page)) {
      items.push(
        `New page ${page.feature}: {{${dir}/controller.test.js}} (GET prefill, every validation branch, raw values on a 400, cleaned values on commit, the recoverable-save 500), {{${dir}/copy/copy.test.js}}, a case in {{src/server/app/contract.test.js}}, and {{${dir}/${page.feature}.fit.spec.js}} (first render, happy path, each validation rule in its own test, the error summary link, axe on the first render and the error state).`
      )
    } else {
      const changedCode = page.files.some(
        (file) => !/\/copy\//.test(file.path) && !/\.njk$/.test(file.path)
      )
      const newKeys = page.copy.filter(
        (row) => row.language === 'en' && row.before === null
      )
      if (newKeys.length) {
        items.push(
          `${page.feature}: {{${dir}/copy/copy.test.js}} for the ${newKeys.length} new string(s).`
        )
      }
      if (changedCode && rules) {
        items.push(
          `${page.feature}: {{${dir}/controller.test.js}} for every validation branch, and a test in the page's *.fit.spec.js for each of its ${rules} rule(s).`
        )
      }
    }
  }
  for (const service of report.servicesToBuild ?? []) {
    items.push(
      `Service ${service.name}: {{${service.dir}/${service.name}.test.js}} covering the stub's behaviour and client.js's wire mapping, with the network mocked by nock (as the address book's tests do).`
    )
  }
  if (changesFlow(report)) {
    items.push(
      'The page order or a gate changes: run {{npm run test:fit:journeys}} and update {{fit/journey-smoke.fit.spec.js}} if the walk changes.'
    )
  }
  if (report.testImpact.length) {
    items.push(
      `Update the ${report.testImpact.length} test line(s) that still expect the old words (listed under Detail).`
    )
  }
  items.push(
    `Then run the required checks in {{${TESTING_GUIDE}}}: {{npm run test:high-risk-plants}}, {{npm test}}, {{PORT=3053 npm run test:fit:features}} and {{npm run lint}}.`
  )
  return items
}

/** The workspace skills an implementing agent uses. */
export const AGENT_SKILLS = Object.freeze({
  frontendChange: '.claude/skills/frontend-change/SKILL.md',
  specCatchup: '.claude/skills/spec-catchup/SKILL.md',
  specCover: '.claude/skills/spec-cover/SKILL.md',
  codeStyle: '.claude/skills/code-style/SKILL.md',
  review: '.claude/skills/review/SKILL.md',
  requirementsPipeline: '.claude/skills/requirements-pipeline/SKILL.md'
})

export const TICKET_SCHEMA = 'tim-ticket/1'

/** Where the ticket's description lives, next to `ticket.json` itself. */
export const TICKET_DESCRIPTION_FILE = 'ticket.description.jira.txt'

/**
 * The `tim-ticket/1` manifest a hand-off writes beside its brief, so
 * `tim jira create --from` can raise the story straight from this folder.
 * The project, parent epic and labels come from the prototype's own hand-off
 * settings (`scripts/designer/prototype.json`, read into `meta.prototype`);
 * everything else from the story's own words. Attachments are relative to
 * the manifest's own folder: every picked screenshot, then `upstream.patch`
 * unless the hand-off is brief only, then `brief.md` itself.
 *
 * @param {object} report - from `buildHandoff`.
 * @param {object} meta - the hand-off's own metadata, as `runHandoff` builds it.
 * @returns {object} a `tim-ticket/1` manifest (not yet validated).
 */
export const ticketManifestFor = (report, meta) => {
  const handOff = meta.prototype?.handOff ?? {}
  return {
    schema: TICKET_SCHEMA,
    project: handOff.jiraProject,
    type: 'Story',
    summary: meta.title,
    descriptionFile: TICKET_DESCRIPTION_FILE,
    ...(handOff.parentEpic ? { parent: handOff.parentEpic } : {}),
    labels: handOff.labels ?? [],
    attachments: [
      ...meta.screenshots.map((shot) => `screenshots/${shot.fileName}`),
      ...(report.briefOnly ? [] : ['upstream.patch']),
      'brief.md'
    ],
    relates: []
  }
}

/**
 * The behaviour spec capabilities in the trade-imports workspace that a
 * changed page belongs to, when the workspace is there to look in.
 *
 * @param {object[]} pages
 * @param {(relative: string) => boolean} exists - checks a path under
 * `openspec/specs/plants/`.
 */
export const specCapabilitiesFor = (pages, exists) =>
  pages
    .filter((page) => page.feature)
    .map((page) => `journey-pages/${page.feature}`)
    .filter((capability) => exists(`${capability}/spec.md`))

const withTrailingSlash = (url) => (url.endsWith('/') ? url : `${url}/`)

/**
 * The link to the set's walkthrough in the published Playwright report, from
 * `siteUrl` in `scripts/designer/prototype.json`. With a pull request number
 * it is that pull request's report (`reports/pr-<n>/`); without one it is the
 * report for main at the site root, which shows the release once it is on
 * main (merged from a pull request or pushed straight there).
 *
 * @param {{ siteUrl?: string|null }} prototype - the prototype's facts.
 * @param {string} setId
 * @param {{ pullRequest?: number|string|null }} [options]
 * @returns {{ url: string, line: string }|null} the link and the story's line
 *   for it, or null when no report is published.
 */
export const walkthroughLink = (
  prototype,
  setId,
  { pullRequest = null } = {}
) => {
  const siteUrl = prototype?.siteUrl
  if (!siteUrl) {
    return null
  }
  const base = withTrailingSlash(siteUrl)
  const url = pullRequest
    ? `${base}reports/pr-${pullRequest}/#?q=@${setId}`
    : `${base}#?q=@${setId}`
  const note = pullRequest
    ? ''
    : ' (this shows the saved version once it is on main)'
  return { url, line: `See it walked through, page by page: ${url}${note}` }
}

/**
 * The example links for the changed pages: each opens a saved example
 * notification on that page. Uses an example with no organisation, so the
 * link works on the deployed prototype too.
 *
 * @param {string} base - the prototype's address.
 * @param {string} setId
 * @param {object[]} examples - from `loadExamples`.
 * @param {string[]} slugs - the changed pages' addresses.
 */
export const exampleLinks = (base, setId, examples, slugs) => {
  const open = examples.filter((example) => !example.organisationId)
  const example = open.find((item) => !item.through) ?? open[0]
  if (!example) {
    return []
  }
  return slugs.map((slug) => ({
    page: slug,
    example: example.slug,
    url: `${base}/examples/${setId}/${example.slug}?page=${encodeURIComponent(slug).replaceAll('%2F', '/')}`
  }))
}
