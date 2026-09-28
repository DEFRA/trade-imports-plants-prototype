/**
 * Turns a hand-off report into the two things people read: `brief.md` for the
 * repository and a pull request, and `brief.jira.txt` in Jira wiki markup to
 * paste into a story. Both say the same things in the same order, in plain
 * English.
 *
 * The brief starts with the story in the EUDPA story shape (As, I want, So
 * that, acceptance criteria as Given, When, Then, and a Tech Notes panel),
 * then how to see the prototype, the journey flow, the validation rules, any
 * service to build, the tests to add and a note for the developer or agent.
 * The facts behind all of it follow under "Detail".
 */
import {
  AGENT_SKILLS,
  copyCriteria,
  exampleLinks,
  recipeDocPath,
  recipesFor,
  STORY_PLACEHOLDERS,
  TESTING_GUIDE,
  testsToAdd
} from './story.js'

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

const LOCAL_BASE_URL = 'http://localhost:3103'
const PLANTS_FRONTEND = 'trade-imports-plants-frontend'
const WORKSPACE_ROOT = '~/git/defra/trade-imports-workspace'
const WORKSPACE_PROTOTYPE = `${WORKSPACE_ROOT}/repos/trade-imports-plants-prototype`
const WORKSPACE_PLANTS_FRONTEND = `${WORKSPACE_ROOT}/repos/trade-imports-plants-frontend`

/**
 * Code in the brief's own markup (`{{…}}`, monospace in Jira and Markdown).
 * Code that starts or ends with a curly bracket gets a space inside, so the
 * markup still closes where it should.
 */
const codeSpan = (text) =>
  /^\{|\}$/.test(text) ? `{{ ${text} }}` : `{{${text}}}`

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

/** What designers and the real team call the pages whose ids say otherwise. */
const DESIGNER_PAGE_NAMES = {
  hub: 'Task list',
  'task-list': 'Task list',
  'notification-view': 'Check your answers',
  'check-answers': 'Check your answers'
}

const pageLabel = (slug) => DESIGNER_PAGE_NAMES[slug] ?? readable(slug)

const pageName = (page) =>
  page.feature
    ? `${[...new Set(page.slugs.map(pageLabel))].join(', ')} (${page.slugs.join(', ')})`
    : 'Across the journey (flow, questions or shared parts)'

const shortName = (page) =>
  [...new Set(page.slugs.map(pageLabel))].join(', ') || pageLabel(page.feature)

const madeFrom = (report) => {
  if (report.mode === 'real-journey') {
    return `The real journey (high-risk-plants), compared with ${report.baseRef.slice(0, 7)}.`
  }
  if (report.set === 'sample-journey') {
    return 'The sample-journey placeholder itself.'
  }
  const steps = report.chain.map((hop) => hop.fromId)
  return `Design release ${report.set}, made from ${steps.join(', then ')}.`
}

/** A sentence naming the extra check against the workspace's own sibling
 * clone of plants-frontend (never its working tree, always `origin/main`),
 * when that clone is there to check against. */
const workspaceCloneLine = (report) => {
  const check = report.plantsFrontendApplyCheck
  if (!check) {
    return ''
  }
  return check.ok
    ? ` It also applies cleanly to the workspace's own {{${WORKSPACE_PLANTS_FRONTEND}}} (its ${check.ref}).`
    : ` It does not apply cleanly to the workspace's own {{${WORKSPACE_PLANTS_FRONTEND}}} (its ${check.ref}): merge by hand there too.`
}

const upstreamLine = (report) => {
  const check = report.upstreamApplyCheck
  if (!check) {
    return ` It was not checked against plants-frontend itself: the prototype had not fetched it (git fetch upstream).${workspaceCloneLine(report)}`
  }
  return (
    (check.ok
      ? ` It also applies cleanly to plants-frontend's ${check.ref}, as last fetched.`
      : ` It does not apply cleanly to plants-frontend's ${check.ref}, as last fetched: the real service has moved on since the prototype's last weekly update, so a developer will need to merge by hand.`) +
    workspaceCloneLine(report)
  )
}

const services = (report) => report.servicesToBuild ?? []

const applyLine = (report) => {
  if (report.briefOnly) {
    return `There is no patch. ${report.briefOnly.reason} Build it from this story, the pictures and the prototype itself.`
  }
  if (report.applyCheck.empty) {
    return 'There is no patch: nothing in the real journey changes.'
  }
  const where = report.applyCheck.ok
    ? `The patch applies cleanly to the real journey as it is in the prototype (${report.applyRef === 'HEAD' ? 'this branch' : report.applyRef}).`
    : 'The patch does not apply cleanly to the real journey in the prototype. The real journey has moved on in the same places, so a developer will need to merge by hand (see "Has the real journey moved on?").'
  const leftOut = report.cannotShip.services.length
    ? ' Applying cleanly is not the same as working: the files that use the prototype’s own example data or stub plumbing, and every file that imports them, are left out (see "What was left out and why").'
    : ''
  const proposed = services(report).length
    ? ` The patch also adds the proposed service files (${services(report)
        .map((service) => service.name)
        .join(
          ', '
        )}: index.js and client.js). Each needs its stub.js written before the service starts (see "Service to build").`
    : ''
  return `${where}${upstreamLine(report)}${leftOut}${proposed}`
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

const criteriaOf = (report, meta) => {
  if (meta.criteria?.length && meta.criteriaDraft) {
    return {
      scenarios: meta.criteria,
      source: 'a draft, not yet confirmed by the designer',
      draft: true,
      placeholder: 'Acceptance criteria (a draft: confirm with the designer)'
    }
  }
  if (meta.criteria?.length) {
    return { scenarios: meta.criteria, source: 'the designer', draft: false }
  }
  if (report.wordsOnly) {
    return {
      scenarios: copyCriteria(report.pages, shortName),
      source: 'generated from the changed words',
      draft: false
    }
  }
  return {
    scenarios: [STORY_PLACEHOLDERS.criteria],
    source: 'placeholder',
    draft: false,
    placeholder: 'Acceptance criteria'
  }
}

/**
 * The story's own words and where each came from. Anything the designer did
 * not give stays a placeholder, named in `placeholders`: nothing is made up.
 * Criteria the agent drafted and the designer has not confirmed
 * (`criteriaDraft`) are shown as a draft and named in `placeholders` too.
 *
 * @param {object} report
 * @param {{ as?: string, want?: string, soThat?: string, why?: string, criteria?: object[], criteriaDraft?: boolean }} meta
 */
export const storyOf = (report, meta) => {
  const given = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null
  const placeholders = []
  const pick = (value, name, label) => {
    if (given(value)) {
      return given(value)
    }
    placeholders.push(label)
    return STORY_PLACEHOLDERS[name]
  }
  const as = pick(meta.as, 'as', 'As (who it is for)')
  const want = pick(meta.want, 'want', 'I want (what they need to do)')
  const soThat = pick(meta.soThat, 'soThat', 'So that (why they need it)')
  const why = pick(meta.why, 'why', 'Description (what the change is and why)')
  const criteria = criteriaOf(report, meta)
  if (criteria.placeholder) {
    placeholders.push(criteria.placeholder)
  }
  return {
    as,
    want,
    soThat,
    why,
    scenarios: criteria.scenarios,
    criteriaSource: criteria.source,
    criteriaDraft: criteria.draft,
    placeholders
  }
}

/**
 * Whether the story is ready to raise as it is: no placeholder text left for
 * the designer to fill in, and its acceptance criteria are the designer's
 * own words, not a draft the designer has not yet confirmed.
 *
 * @param {ReturnType<typeof storyOf>} story
 */
export const isStoryReady = (story) =>
  story.placeholders.length === 0 && !story.criteriaDraft

const patchNote = (report) => {
  if (report.briefOnly) {
    return `No patch. ${report.briefOnly.reason}`
  }
  if (report.applyCheck.empty) {
    return 'No patch: nothing in the real journey changes.'
  }
  const here = report.applyCheck.ok
    ? 'upstream.patch applies cleanly to the prototype’s copy of the real journey'
    : 'upstream.patch does not apply cleanly to the prototype’s copy of the real journey'
  const check = report.upstreamApplyCheck
  let there = 'plants-frontend itself was not checked'
  if (check) {
    there = check.ok
      ? `and to plants-frontend's ${check.ref}`
      : `but not to plants-frontend's ${check.ref}`
  }
  return `${here}, ${there}.`
}

const driftNote = (report) => {
  const { drift } = report
  if (report.mode === 'real-journey' || report.placeholder) {
    return 'None: there is no release copy to drift from.'
  }
  if (!drift.ref) {
    return 'Not known: the release has not been saved yet.'
  }
  if (drift.overlapping.length) {
    return `The real journey has changed in ${drift.overlapping.length} file(s) this change also touches: merge by hand.`
  }
  return drift.elsewhere.length
    ? `The real journey has changed in ${drift.elsewhere.length} other file(s); none of them is in the patch.`
    : 'The real journey has not changed since the release was made.'
}

const OWNER_REPOS = {
  'plants-backend': 'trade-imports-plants-backend',
  ins: 'the INS services (trade-imports-address-book or trade-imports-ins-backend, to be agreed)',
  'new-api': 'a new API, owner to be agreed'
}

const reposNote = (report) => {
  const owners = services(report)
    .map((service) => service.contract?.owner)
    .filter(Boolean)
    .map((owner) => OWNER_REPOS[owner] ?? owner)
  return [PLANTS_FRONTEND, ...new Set(owners)].join('; ')
}

const recipePaths = (report) => {
  const { named, inferred } = recipesFor(report)
  return [
    ...named.map((recipe) => ({
      recipe,
      ...recipeDocPath(recipe),
      how: 'named'
    })),
    ...inferred.map((recipe) => ({
      recipe,
      ...recipeDocPath(recipe),
      how: 'worked out from the change'
    }))
  ]
}

const recipeNote = (report) => {
  const paths = recipePaths(report)
  if (paths.length === 0) {
    return report.wordsOnly
      ? 'None: words only.'
      : 'None named. See "For the developer or agent".'
  }
  return paths
    .map((item) => `{{${item.path}}} (${item.repo}, ${item.how})`)
    .join(', ')
}

const addStory = (add, report, meta, story) => {
  add('storyLines', {
    lines: [
      ['As', `${story.as},`],
      ['I want', `${story.want},`],
      ['So that', story.soThat]
    ]
  })
  add('label', { text: 'Description' })
  add('para', { text: story.why })
  add('para', {
    text: `Designed in the plants prototype and handed off on ${longDate(meta.date)}. ${madeFrom(report)} See the prototype, the pictures and the detail below.`
  })
  add('criteria', {
    scenarios: story.scenarios,
    source: story.criteriaSource,
    draft: story.criteriaDraft
  })
  const tests = testsToAdd(report)
  add('panel', {
    title: 'Tech Notes',
    items: [
      `Repos: ${reposNote(report)}.`,
      `Patch: ${patchNote(report)}`,
      `Drift: ${driftNote(report)}`,
      services(report).length
        ? `Services: build ${services(report)
            .map((service) => `{{${service.dir}}}`)
            .join(', ')} (see "Service to build").`
        : 'Services: none new.',
      `Tests: ${tests.length - 1} to add or update (see "Tests to add"); the checks are in {{${TESTING_GUIDE}}}.`,
      `Recipe: ${recipeNote(report)}`,
      ...(report.cannotShip.welshNeeded.length
        ? [
            `Welsh: ${report.cannotShip.welshNeeded.length} string(s) still need translating.`
          ]
        : []),
      `Branch: {{${meta.branch}}} in ${PLANTS_FRONTEND}.`,
      'Parent epic: chosen when the story is raised.'
    ]
  })
}

const localSteps = (report, meta, links) => {
  const open = links.length
    ? `Open {{${links[0].url.replace(/^https?:\/\/[^/]+/, LOCAL_BASE_URL)}}} (an example notification, on the changed page), or {{${LOCAL_BASE_URL}/${report.set}}} to start one.`
    : `Open {{${LOCAL_BASE_URL}/${report.set}}} and start a notification.`
  return [
    designBranchStep(meta),
    `{{npm --prefix ${WORKSPACE_PROTOTYPE} run dev}}`,
    open
  ]
}

const designBranchStep = (meta) => {
  if (!meta.designBranch) {
    return `Switch to the design branch the link above names, in {{${WORKSPACE_PROTOTYPE}}}.`
  }
  const notPushed =
    meta.designBranchOnGitHub === false
      ? ' (this branch is not on GitHub yet: ask the designer to push it first)'
      : ''
  return `{{git -C ${WORKSPACE_PROTOTYPE} switch ${meta.designBranch}}}${notPushed}`
}

const addSeeThePrototype = (add, report, meta) => {
  add('heading', { text: 'See the prototype' })
  const deployed = meta.prototype?.deployedUrl ?? null
  const base = deployed ?? LOCAL_BASE_URL
  const slugs = [...new Set(report.pages.flatMap((page) => page.slugs))]
  const links = exampleLinks(base, report.set, meta.examples ?? [], slugs)
  const items = [
    ...(meta.links ?? []).map((link) => link),
    ...(deployed ? [`The deployed prototype: ${deployed}/${report.set}`] : []),
    ...links.map(
      (link) =>
        `${pageLabel(link.page)} page, with the "${link.example}" example: ${link.url}`
    )
  ]
  if (items.length) {
    add('list', { items })
  }
  if (!deployed) {
    add('para', {
      text: links.length
        ? 'The prototype is not deployed yet, so the example links work once it runs on your own computer (below).'
        : 'The prototype is not deployed yet. Run it on your own computer (below).'
    })
  }
  if (!links.length) {
    add('para', {
      text: `${report.set} has no example notifications to link to. Start one from the dashboard and go to the changed pages.`
    })
  }
  add('subheading', { text: 'Run it on your own computer' })
  add('numbered', { items: localSteps(report, meta, links) })
}

const addJourneyFlow = (add, report) => {
  add('heading', { text: 'Journey flow' })
  const flow = report.journeyFlow
  if (!flow) {
    add('para', { text: 'Not worked out for this hand-off.' })
  } else if (flow.error) {
    add('para', {
      text: `The page order could not be read: ${flow.error}. Run {{npm run designer:release -- orders ${report.set}}} in the prototype to see it.`
    })
  } else if (flow.rows.every((row) => row.moved === false)) {
    add('para', {
      text: 'The page order does not change. None of the changed pages moves.'
    })
  } else {
    add('para', {
      text: `The page orders that change or hold a changed page (changed pages in {{code}}). Before is ${flow.before ?? 'not known'}.`
    })
    add('table', {
      header: ['Order', 'Before', 'After'],
      rows: flow.rows.map((row) => [row.order, row.before, row.after])
    })
  }
  const gates = report.gateChanges ?? []
  if (gates.length) {
    add('para', { text: 'Gate, condition and order lines that change:' })
    add('list', {
      items: gates.flatMap((gate) => [
        ...gate.added.map((line) => `{{${gate.file}}} adds ${codeSpan(line)}`),
        ...gate.removed.map(
          (line) => `{{${gate.file}}} removes ${codeSpan(line)}`
        )
      ])
    })
  } else {
    add('para', { text: 'No gate or condition changes.' })
  }
}

/**
 * How the change touches a validation row's error: 'New' or 'Changed' when
 * its English words are new or changed on that page, else null.
 */
const validationChangeOf = (report, row) => {
  const page = report.pages.find((item) => item.feature === row.page)
  const copyRow = row.key
    ? page?.copy.find((item) => item.language === 'en' && item.key === row.key)
    : null
  if (!copyRow) {
    return null
  }
  return copyRow.before === null ? 'New' : 'Changed'
}

const addValidation = (add, report) => {
  add('heading', { text: 'Validation' })
  const rows = (report.validation ?? []).map((row) => ({
    ...row,
    change: validationChangeOf(report, row)
  }))
  if (rows.length === 0) {
    add('para', { text: 'The changed pages have no validation rules.' })
    return
  }
  const touched = rows.filter((row) => row.change)
  if (touched.length) {
    add('para', {
      text: `${touched.length} rule(s) are new or changed, and come first, marked in the Rule column. The rest are the changed pages' other rules, unchanged.`
    })
  }
  add('table', {
    header: ['Page', 'Field', 'Rule', 'English error', 'Welsh error'],
    rows: [...touched, ...rows.filter((row) => !row.change)].map((row) => [
      row.page,
      codeSpan(row.field),
      row.change ? `${row.change}: ${row.rule}` : row.rule,
      showValue(row.english),
      showValue(row.welsh)
    ])
  })
}

const describe = (value) => {
  if (value === null || value === undefined) {
    return '(none)'
  }
  if (typeof value === 'string') {
    return value
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(describe).join(', ') : '(none)'
  }
  if (typeof value === 'object') {
    if (Object.keys(value).length === 0) {
      return '(none)'
    }
    if (value.name && Object.keys(value).length <= 4) {
      const extras = Object.entries(value)
        .filter(([key]) => key !== 'name')
        .map(([key, item]) => `${key}: ${describe(item)}`)
      return extras.length ? `${value.name} (${extras.join('; ')})` : value.name
    }
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${describe(item)}`)
      .join('; ')
  }
  return String(value)
}

const OWNER_QUESTION = {
  'plants-backend': 'the plants backend (trade-imports-plants-backend)',
  ins: 'the INS services',
  'new-api': 'a new API'
}

/**
 * The questions the story leaves open: which backend owns the data and
 * whether the proposed endpoints are right, then the service's own. A
 * question the service already asks is not asked twice.
 */
const serviceQuestions = (service) => {
  const contract = service.contract ?? {}
  const own = (contract.openQuestions ?? []).map(describe)
  const asks = (pattern) => own.some((question) => pattern.test(question))
  const endpoints = (contract.operations ?? [])
    .filter((operation) => operation.method && operation.path)
    .map((operation) => codeSpan(`${operation.method} ${operation.path}`))
  const ownerQuestion = asks(/\bowns?\b/i)
    ? []
    : [
        `Which backend owns this data? The prototype proposes ${OWNER_QUESTION[contract.owner] ?? 'no owner yet'}.`
      ]
  let endpointQuestion = []
  if (!asks(/endpoint|\bREST\b/i)) {
    endpointQuestion = endpoints.length
      ? [`Are ${endpoints.join(', ')} the right REST noun endpoints for it?`]
      : ['What REST noun endpoints should it have?']
  }
  return [...ownerQuestion, ...endpointQuestion, ...own]
}

/** An example as a request and what comes back, or as a record. */
const exampleText = (example) =>
  example && typeof example === 'object' && example.request
    ? `${codeSpan(String(example.request))} gives back ${JSON.stringify(example.response ?? null)}`
    : JSON.stringify(example)

const REAL_STUB = '{{src/server/app/services/countries/stub.js}}'

/** Why stub.js stays behind, naming its prototype-only import(s). */
const stubSentence = (imports) => {
  const names = imports.map((file) => `{{${file}}}`)
  if (names.length === 0) {
    return `{{stub.js}} is not in the patch. Write it with the starter rows as an array, as ${REAL_STUB} does.`
  }
  const which =
    names.length === 1
      ? `its one prototype-only import is ${names[0]}`
      : `its prototype-only imports are ${names.join(' and ')}`
  return `{{stub.js}} is not in the patch: ${which}, which plants-frontend does not have. Write a plain {{stub.js}} with the starter rows as an array, as ${REAL_STUB} does.`
}

const addService = (add, service) => {
  const contract = service.contract ?? {}
  add('heading', { text: `Service to build: ${service.name}` })
  add('para', {
    text: service.needs ?? 'The service gives no NEEDS_A_REAL_SERVICE sentence.'
  })
  add('para', {
    text: `It goes in {{${service.target}/}} in plants-frontend, the same place and shape as the real services (countries, ports): {{index.js}} chooses {{stub.js}} or {{client.js}} by run mode. {{index.js}} and {{client.js}} are in upstream.patch, marked proposed${service.modeSwitchRenamed ? ', with the prototype’s isStubDataMode() written as plants-frontend’s isStubMode()' : ''}. The story asks for the backend endpoint${contract.baseUrlEnv ? ` (its address in {{${contract.baseUrlEnv}}})` : ''} and for {{client.js}} to be hardened. It is used by: ${service.usedBy.map((file) => `{{${file}}}`).join(', ') || '(no changed page)'}.`
  })
  add('para', {
    text: stubSentence(service.stubPrototypeImports)
  })
  if (!service.contractReadable) {
    add('para', {
      text: `The service's CONTRACT could not be read as data. Read {{${service.files.index}}} in the prototype for its operations.`
    })
  }
  const operations = contract.operations ?? []
  if (operations.length) {
    add('table', {
      header: ['Operation', 'Method and path', 'Takes', 'Gives back', 'Errors'],
      rows: operations.map((operation) => [
        codeSpan(String(operation.name)),
        operation.method && operation.path
          ? codeSpan(`${operation.method} ${operation.path}`)
          : '(not set)',
        describe(operation.params),
        describe(operation.returns),
        describe(operation.errors)
      ])
    })
  }
  const fields = contract.record?.fields ?? []
  if (fields.length) {
    add('table', {
      header: ['Field', 'Type', 'Required', 'Allowed values'],
      rows: fields.map((field) => [
        codeSpan(String(field.name)),
        describe(field.type),
        field.required ? 'Yes' : 'No',
        field.enum ? describe(field.enum) : 'Any'
      ])
    })
  }
  const examples = contract.examples ?? []
  if (examples.length) {
    add('para', { text: 'Example records, from the prototype’s stub:' })
    add('list', { items: examples.map(exampleText) })
  }
  add('para', { text: 'Open questions for the team:' })
  add('list', { items: serviceQuestions(service) })
  if (service.proposedPrototypeImports.length) {
    add('para', {
      text: `Fix before handing off: {{index.js}} or {{client.js}} imports {{${service.proposedPrototypeImports.join('}}, {{')}}}, which only the prototype has.`
    })
  }
}

const addTestsToAdd = (add, report) => {
  add('heading', { text: 'Tests to add' })
  add('list', { items: testsToAdd(report) })
}

/** C1: one to three frontend-only elements, no clash — build it directly in
 * the workspace's own plants-frontend checkout, recipe by recipe. */
const recipeRoute = (report, meta) => {
  const recipes = recipePaths(report)
  const recipeText = recipes.length
    ? recipes.map((item) => `{{${item.path}}}`).join(', ')
    : 'the recipe that fits in {{src/server/app/sets/high-risk-plants/docs/}}'
  return `Build it properly in {{${WORKSPACE_PLANTS_FRONTEND}}} on {{${meta.branch}}}, with the frontend-change skill ({{${AGENT_SKILLS.frontendChange}}}, target high-risk-plants-frontend), following ${recipeText}. Then run spec-catchup and spec-cover ({{${AGENT_SKILLS.specCatchup}}}, {{${AGENT_SKILLS.specCover}}}) for {{openspec/specs/plants}} in the workspace, so the behaviour spec and its coverage catch up with the change. Then run code-style and review ({{${AGENT_SKILLS.codeStyle}}}, {{${AGENT_SKILLS.review}}}) before it is ready to merge.`
}

/** C2: a new service — not one recipe. Goes to the requirements-pipeline
 * skill as a full-stack story, naming the service's owner repo. */
const newServiceRoute = (report) => {
  const owners = [
    ...new Set(
      services(report)
        .map((service) => service.contract?.owner)
        .filter(Boolean)
    )
  ]
  const ownerText = owners.length
    ? owners.map((owner) => OWNER_REPOS[owner] ?? owner).join(', ')
    : 'to be agreed'
  return `This adds a new service, not one recipe: raise it as a full-stack story through the requirements-pipeline skill ({{${AGENT_SKILLS.requirementsPipeline}}}) in the trade-imports workspace, with this hand-off folder, the design branch and {{${WORKSPACE_PLANTS_FRONTEND}}} as sources, and its owner repo (${ownerText}) named for the increments that reach it. It works out the full-stack increments and builds them one at a time; a designer session never launches that build itself.`
}

/** C2: a clash with a standing ruling (a service the real journey removed on
 * purpose) — the product owner settles it before any code changes. */
const rulingConflictRoute = () =>
  `This clashes with a standing ruling to remove a service from the real journey (see "What cannot ship as it is"): raise it through the requirements-pipeline skill ({{${AGENT_SKILLS.requirementsPipeline}}}) in the trade-imports workspace so the product owner settles the conflict before any code changes.`

const addForTheDeveloper = (add, report, meta) => {
  add('heading', { text: 'For the developer or agent' })
  const start = report.briefOnly
    ? 'There is no patch: build it from this story and the pictures.'
    : 'Start from upstream.patch in this hand-off folder as a starting point.'
  const rulingConflict = (report.rulingConflicts ?? []).length > 0
  const newService = services(report).length > 0
  add('para', {
    text: rulingConflict
      ? `${start} ${rulingConflictRoute()}`
      : newService
        ? `${start} ${newServiceRoute(report)}`
        : `${start} ${recipeRoute(report, meta)}`
  })
  if (!rulingConflict && !newService) {
    const capabilities = report.specCapabilities ?? []
    const spec = capabilities.length
      ? capabilities
          .map(
            (capability) =>
              `{{openspec/specs/plants/${capability}/spec.md}} with {{openspec/coverage/plants/${capability}/coverage.json}}`
          )
          .join(', ')
      : 'the matching capability under {{openspec/specs/plants/}} with its {{coverage.json}} under {{openspec/coverage/plants/}}'
    add('para', {
      text: `The testing guide is {{${TESTING_GUIDE}}}. The behaviour spec to update: ${spec}.`
    })
  }
}

/**
 * The content of the brief as a list of blocks, so the Markdown and Jira
 * renderers share one outline. Each block is `{ kind, ... }`.
 */
export const briefOutline = (report, meta) => {
  const blocks = []
  const add = (kind, fields) => blocks.push({ kind, ...fields })
  const shots = meta.screenshots ?? []
  const story = storyOf(report, meta)

  add('title', { text: meta.title })
  addStory(add, report, meta, story)
  addSeeThePrototype(add, report, meta)
  addJourneyFlow(add, report)
  addValidation(add, report)
  for (const service of services(report)) {
    addService(add, service)
  }
  addTestsToAdd(add, report)
  addForTheDeveloper(add, report, meta)

  add('rule', {})
  add('heading', { text: 'Detail' })
  add('para', {
    text: `Hand-off from the plants prototype, ${longDate(meta.date)}. ${madeFrom(report)}`
  })

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
          text: `None found. No requirement file under the real journey’s spec folder${report.specSources?.workspace ? ', and no behaviour spec under the workspace’s openspec/specs/plants,' : ''} quotes the old words.`
        }
  )
  if (spec.length) {
    add('para', {
      text: 'These requirement files still say the old words. Update them with the patch, or the spec and the pages will disagree. Files under openspec/ are in the trade-imports workspace, not in plants-frontend.'
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

const recipeLine = (report) => {
  const { named, inferred } = recipesFor(report)
  if (named.length || inferred.length) {
    const parts = [
      ...(named.length ? [`${named.join(', ')} (named)`] : []),
      ...(inferred.length
        ? [`${inferred.join(', ')} (worked out from the change)`]
        : [])
    ]
    return `This change followed: ${parts.join('; ')}. The Tech Notes say where each recipe is written down.`
  }
  return report.wordsOnly
    ? 'Words only (change-the-words): every changed file is a copy file, so no recipe applies.'
    : 'No recipe named. The change is to layout only, or the commit messages do not name one.'
}

const WANTS = 'what the design wants'
const CONTENT_NOTE = /^content note\b:?\s*/i

/**
 * Whether a design-gaps.md row is a note for the content designer rather
 * than a gap. The note is the second cell after "Content note:"; a row
 * written with the note in the third cell ("Content note" alone first) is
 * read the same way.
 */
export const isContentNote = (row) => CONTENT_NOTE.test(row[WANTS] ?? '')

const contentNoteText = (row) => {
  const inWants = (row[WANTS] ?? '').replace(CONTENT_NOTE, '').trim()
  const note = inWants || row['closest option built'] || ''
  const action = row.why ? ` (${row.why.replace(/\.$/, '')})` : ''
  const page = row.page ? `${pageLabel(row.page)}: ` : ''
  return `${page}${note}${action}`
}

const addContentNotes = (add, notes) => {
  if (notes.length === 0) {
    return
  }
  add('heading', { text: 'Content notes' })
  add('list', { items: notes.map(contentNoteText) })
  add('para', {
    text: 'Notes for a content designer on the new words. Nothing here stops the change shipping.'
  })
}

const KIND_LABEL = {
  'prototype-data': 'the prototype’s extra example data',
  'prototype-support': 'the prototype’s stub plumbing'
}

const addCannotShip = (add, report) => {
  const { researchRules, welshNeeded } = report.cannotShip
  const prototypeOnly = report.cannotShip.services
  const designGaps = report.cannotShip.designGaps.filter(
    (row) => !isContentNote(row)
  )
  addContentNotes(add, report.cannotShip.designGaps.filter(isContentNote))
  add('heading', { text: 'What cannot ship as it is' })
  const items = [
    ...services(report).map(
      (service) =>
        `{{${service.dir}}} is a new service, proposed in the patch. It works once its backend endpoint exists, {{client.js}} is hardened and a plain {{stub.js}} is written (see "Service to build: ${service.name}").`
    ),
    ...prototypeOnly.map(
      (item) =>
        `{{${item.file}}} imports {{${item.specifier}}}, ${KIND_LABEL[item.kind] ?? 'code only the prototype has'}. It needs a real source for that data.`
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
    ),
    ...(report.rulingConflicts ?? []).map(
      (conflict) =>
        `Ruling conflict: ${conflict.service} matches "${conflict.matchedTerm}", a service removed from the real journey on purpose (recorded in {{${conflict.source}}}). Check with the product owner before building it again.`
    )
  ]
  add(
    items.length ? 'list' : 'para',
    items.length
      ? { items }
      : {
          text: 'Nothing. No new services, prototype-only data, Welsh gaps, design gaps or research-mode rules.'
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
  if (report.placeholder) {
    add('para', {
      text: 'Not relevant: the release was made from the sample-journey placeholder, not the real journey.'
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
  if (report.briefOnly) {
    add('para', {
      text: `Raise it as a story (paste brief.jira.txt), then a developer builds it in a clone of trade-imports-plants-frontend on {{${meta.branch}}}.`
    })
  } else {
    add('para', {
      text: 'This change can reach the real service in one of two ways:'
    })
    add('list', {
      items: [
        'Give this brief and upstream.patch to the plants-frontend team. They raise a story from it (paste brief.jira.txt) and make the change.',
        `A developer applies the patch in a clone of trade-imports-plants-frontend: {{git switch -c ${meta.branch}}}, then {{git apply --3way upstream.patch}}, then updates the tests listed above, runs {{npm test}} and raises a pull request.`
      ]
    })
  }
  add('para', {
    text: 'The prototype never pushes to plants-frontend. Once the real team merges the change, the weekly update brings it back into the prototype.'
  })
}

const escapeMarkdownCell = (text) => text.replace(/\|/g, '\\|')

const toMarkdownInline = (text) => text.replace(/\{\{(.+?)\}\}/g, '`$1`')

const markdownScenario = (scenario) =>
  [
    ...(scenario.title ? [`Scenario: ${scenario.title}`, ''] : []),
    ...scenario.steps.map(
      (step) => `- **${step.keyword}** ${toMarkdownInline(step.text)}`
    )
  ].join('\n')

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
        case 'label':
          return `**${block.text}**`
        case 'rule':
          return '---'
        case 'storyLines':
          return block.lines
            .map(([label, text]) => `**${label}** ${toMarkdownInline(text)}`)
            .join('\n\n')
        case 'criteria':
          return [
            block.draft
              ? '**Draft acceptance criteria, to confirm**'
              : '**Acceptance criteria**',
            ...block.scenarios.map(markdownScenario)
          ].join('\n\n')
        case 'panel':
          return [
            `**${block.title}**`,
            block.items.map((item) => `- ${toMarkdownInline(item)}`).join('\n')
          ].join('\n\n')
        case 'list':
          return block.items
            .map((item) => `- ${toMarkdownInline(item)}`)
            .join('\n')
        case 'numbered':
          return block.items
            .map((item, index) => `${index + 1}. ${toMarkdownInline(item)}`)
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

const jiraScenario = (scenario) =>
  [
    ...(scenario.title ? [`_${escapeJira(scenario.title)}_`] : []),
    ...scenario.steps.map(
      (step) => `*${step.keyword}* ${escapeJira(step.text)}`
    )
  ].join('\n')

/** The brief in Jira wiki markup, ready to paste into a story. */
export const renderBriefJira = (blocks) =>
  blocks
    .map((block) => {
      switch (block.kind) {
        case 'title':
          return `*Summary:* ${escapeJira(block.text)}`
        case 'heading':
          return `h2. ${escapeJira(block.text)}`
        case 'subheading':
          return `h3. ${escapeJira(block.text)}`
        case 'label':
          return `*${escapeJira(block.text)}*`
        case 'rule':
          return '----'
        case 'storyLines':
          return block.lines
            .map(([label, text]) => `*${label}* ${escapeJira(text)}`)
            .join('\n')
        case 'criteria':
          return [
            block.draft
              ? '+*Draft Acceptance Criteria, to confirm*+'
              : '+*Acceptance Criteria*+',
            block.scenarios.map(jiraScenario).join('\n\n')
          ].join('\n')
        case 'panel':
          return [
            `{panel:title=${block.title}|bgColor=#deebff}`,
            ...block.items.map((item) => `* ${escapeJira(item)}`),
            '{panel}'
          ].join('\n')
        case 'list':
          return block.items.map((item) => `* ${escapeJira(item)}`).join('\n')
        case 'numbered':
          return block.items.map((item) => `# ${escapeJira(item)}`).join('\n')
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

const ATTACH_SUFFIX = / \(attach [^)]*\)/g

/**
 * The ticket's Jira description, for `ticket.json`'s `descriptionFile`: the
 * same brief in Jira wiki markup, minus the `*Summary:*` line (Jira's own
 * Summary field carries that) and minus every image's "(attach ...)"
 * suffix (the manifest's own `attachments` list does the attaching).
 *
 * @param {object[]} blocks - from `briefOutline`.
 */
export const renderTicketDescriptionJira = (blocks) =>
  renderBriefJira(blocks.filter((block) => block.kind !== 'title')).replace(
    ATTACH_SUFFIX,
    ''
  )
