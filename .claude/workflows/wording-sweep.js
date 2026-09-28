export const meta = {
  name: 'wording-sweep',
  description:
    'Change many strings across one design release in English and Welsh together: locate, plan, edit per feature folder, check, show',
  whenToUse:
    'A wording change on more than 5 pages, or a pasted content document, in one design release. Launch by scriptPath with args { set, sweeps: [{ find, replace, scope }], welsh: "mark" | "given", welshText }. Refuses high-risk-plants and frozen releases.',
  phases: [
    { title: 'Locate', detail: 'designer:words find for every sweep' },
    { title: 'Plan', detail: 'group edits by feature folder, flag functions' },
    { title: 'Edit', detail: 'one builder per feature folder, en and cy only' },
    { title: 'Verify', detail: 'designer:check, repaired at most 3 times' },
    { title: 'Show', detail: 'designer:show for the changed pages' }
  ]
}

/* global agent, parallel, phase, log, args */

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

// The one place to point each kind of step at a model. A `runner` runs one
// command and reports what it printed, a `builder` edits copy files and a
// `judge` plans. Any model name the Workflow tool accepts goes here.
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }

const MAX_PARALLEL_BUILDERS = 6
const MAX_REPAIRS = 3
const REAL_JOURNEY = 'high-risk-plants'
const PLACEHOLDER = 'sample-journey'
const WELSH_NEEDED = '[Welsh needed]'

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = ['set', 'sweeps', 'welsh', 'welshText']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

function fail(message) {
  throw new Error(`${WORKFLOW_NAME}: ${message}`)
}

function isText(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function isValidScope(scope) {
  if (scope === 'all') {
    return true
  }
  return Array.isArray(scope) && scope.length > 0 && scope.every(isText)
}

function checkSweep(sweep, index) {
  const number = index + 1
  if (!sweep || !isText(sweep.find) || typeof sweep.replace !== 'string') {
    fail(`sweep ${number} needs find (words) and replace (words).`)
  }
  if (!isValidScope(sweep.scope)) {
    fail(`sweep ${number} needs scope: "all" or a list of page names.`)
  }
}

function checkWelsh(welsh, welshText, sweepCount) {
  if (welsh !== 'mark' && welsh !== 'given') {
    fail('welsh must be "mark" (no Welsh yet) or "given" (Welsh supplied).')
  }
  if (welsh === 'mark' && welshText !== null) {
    fail('welshText must be null when welsh is "mark".')
  }
  const oneEach =
    Array.isArray(welshText) &&
    welshText.length === sweepCount &&
    welshText.every(isText)
  if (welsh === 'given' && !oneEach) {
    fail('with welsh "given", welshText must hold one Welsh string per sweep.')
  }
}

function checkConfig(given) {
  if (!isText(given.set)) {
    fail('set must be the id of a design release.')
  }
  if (given.set === REAL_JOURNEY) {
    fail(
      'high-risk-plants is the real service journey. A sweep never changes it: sweep a design release, or use the hand-off skill to prepare the change for the real team.'
    )
  }
  if (given.set === PLACEHOLDER) {
    fail('sample-journey is a placeholder with no journey to reword.')
  }
  if (!Array.isArray(given.sweeps) || given.sweeps.length === 0) {
    fail('sweeps must be a list of { find, replace, scope }, at least one.')
  }
  given.sweeps.forEach(checkSweep)
  checkWelsh(given.welsh, given.welshText, given.sweeps.length)
}

checkConfig(config)

const { set, sweeps, welsh, welshText } = config

const GUARD_RAILS = [
  'GUARD RAILS:',
  '- Work from the repository root. One Bash command per call: no &&, ; or |.',
  '- Never commit, push, run git add, or install anything.',
  `- Only ever change files inside src/server/app/sets/${set}/.`,
  '- Never change src/server/app/shared/**, templates, controllers, flow files or tests.'
].join('\n')

const STRING = { type: 'string' }
const NUMBER = { type: 'number' }
const BOOLEAN = { type: 'boolean' }
const STRINGS = { type: 'array', items: STRING }

const LEAF_SCHEMA = {
  type: 'object',
  properties: {
    feature: STRING,
    pages: STRINGS,
    alsoOn: STRINGS,
    pageNames: STRINGS,
    alsoOnNames: STRINGS,
    keyPath: STRING,
    file: STRING,
    line: NUMBER,
    cyFile: STRING,
    cyLine: NUMBER,
    en: STRING,
    cy: { type: ['string', 'null'] },
    kind: STRING,
    welsh: STRING,
    shared: BOOLEAN
  },
  required: ['feature', 'pages', 'keyPath', 'file', 'en', 'cy', 'kind']
}

const TEMPLATE_HIT_SCHEMA = {
  type: 'object',
  properties: { file: STRING, line: NUMBER, text: STRING, shared: BOOLEAN },
  required: ['file', 'line', 'text', 'shared']
}

const LOCATE_SCHEMA = {
  type: 'object',
  properties: {
    ok: BOOLEAN,
    error: STRING,
    kind: STRING,
    frozen: BOOLEAN,
    copy: { type: 'array', items: LEAF_SCHEMA },
    templates: { type: 'array', items: TEMPLATE_HIT_SCHEMA }
  },
  required: ['ok', 'copy', 'templates']
}

const EDIT_SCHEMA = {
  type: 'object',
  properties: {
    keyPath: STRING,
    pages: STRINGS,
    kind: STRING,
    before: STRING,
    after: STRING,
    cyBefore: STRING,
    cyAfter: STRING,
    welshNeeded: BOOLEAN,
    note: STRING
  },
  required: ['keyPath', 'pages', 'kind', 'before', 'after', 'cyBefore']
}

const GROUP_SCHEMA = {
  type: 'object',
  properties: {
    folder: STRING,
    enFile: STRING,
    cyFile: STRING,
    edits: { type: 'array', items: EDIT_SCHEMA }
  },
  required: ['folder', 'enFile', 'cyFile', 'edits']
}

const SKIPPED_SCHEMA = {
  type: 'object',
  properties: { where: STRING, text: STRING, reason: STRING },
  required: ['where', 'text', 'reason']
}

const SHARED_SCHEMA = {
  type: 'object',
  properties: { keyPath: STRING, file: STRING, before: STRING, after: STRING },
  required: ['keyPath', 'file', 'before', 'after']
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    groups: { type: 'array', items: GROUP_SCHEMA },
    skipped: { type: 'array', items: SKIPPED_SCHEMA },
    shared: { type: 'array', items: SHARED_SCHEMA }
  },
  required: ['groups', 'skipped', 'shared']
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: { applied: STRINGS, problems: STRINGS },
  required: ['applied', 'problems']
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    passed: BOOLEAN,
    summary: STRING,
    failures: STRINGS,
    logPath: STRING
  },
  required: ['passed', 'summary', 'failures']
}

const SHOW_SCHEMA = {
  type: 'object',
  properties: { ok: BOOLEAN, galleryPath: STRING, summary: STRING },
  required: ['ok', 'summary']
}

function runner(prompt, opts) {
  return agent(prompt, { ...opts, model: MODELS.runner, effort: 'low' })
}

function builder(prompt, opts) {
  return agent(prompt, { ...opts, model: MODELS.builder })
}

function judge(prompt, opts) {
  return agent(prompt, { ...opts, model: MODELS.judge })
}

function inBatches(items, size) {
  const batches = []
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size))
  }
  return batches
}

// ---------------------------------------------------------------------------
// Locate: one runner per sweep runs the find and reports its JSON.

function locatePrompt(sweep) {
  const command = `npm run designer:words -- find ${JSON.stringify(sweep.find)} --set ${set} --json`
  return [
    'Run this one command from the repository root and report what it printed:',
    '',
    command,
    '',
    'After the npm banner lines the output is JSON with keys sets, copy, templates and pinned.',
    'Return ok: true, kind and frozen from sets[0], and the copy and templates arrays exactly as printed (every field, unchanged).',
    'If the command fails, return ok: false, the message in error, and empty arrays.',
    '',
    GUARD_RAILS
  ].join('\n')
}

function locate(sweep) {
  return runner(locatePrompt(sweep), {
    phase: 'Locate',
    label: `find "${sweep.find}"`,
    schema: LOCATE_SCHEMA
  })
}

phase('Locate')

const located = await parallel(sweeps.map((sweep) => () => locate(sweep)))

const notFound = sweeps.filter((sweep, index) => !located[index]?.ok)
if (notFound.length > 0) {
  const names = notFound.map((sweep) => `"${sweep.find}"`).join(', ')
  const reasons = located
    .filter((result) => !result?.ok)
    .map((result) => result?.error ?? 'the find step did not answer')
  fail(`could not search for ${names}: ${reasons.join('; ')}`)
}

const release = located[0]
if (release.frozen) {
  return {
    set,
    refused: `${set} is a frozen release. Start a working release from it instead (design-release), then run the sweep there.`
  }
}
if (release.kind === 'real-journey') {
  return {
    set,
    refused: `${set} is the real service journey. Sweep a design release instead.`
  }
}

const matchCount = located.reduce(
  (total, result) => total + result.copy.length + result.templates.length,
  0
)
log(`${WORKFLOW_NAME}: ${matchCount} matches across ${sweeps.length} sweeps`)
if (matchCount === 0) {
  return {
    set,
    table: [],
    note: 'Nothing matched any sweep. Check the spelling against the page, or use fewer words.'
  }
}

// ---------------------------------------------------------------------------
// Plan: the judge needs every sweep's matches at once, to merge sweeps that
// hit the same string and to group the edits so no two builders share a file.

const sweepBriefs = sweeps.map((sweep, index) => ({
  ...sweep,
  welshReplacement: welsh === 'given' ? welshText[index] : null,
  matches: located[index]
}))

const PLAN_PROMPT = [
  `You are planning a wording sweep in the design release "${set}" of a GOV.UK prototype.`,
  'Each sweep replaces words in copy strings. For every sweep below you have its find result: each copy string (copy) and template line (templates) that contains the words.',
  '',
  'Build the plan:',
  '1. Copy entries with shared: true are shared chrome owned by the real service. Never plan an edit for them. List each in "shared" with the before and after English.',
  '2. Template entries are words written straight into a page template. Never plan an edit for them. List each in "skipped" with the reason "written in the page template, not in copy".',
  '3. Apply each sweep\'s scope. "all" keeps every match. A list of page names keeps only matches whose pages, alsoOn, pageNames or alsoOnNames include one of them (a page can be named by its id, consignor-select, or its address, consignors/select; task-list and hub are the same page); list the others in "skipped" with the reason "outside the scope of this sweep".',
  '4. For each remaining copy entry write the new English ("after"): replace the sweep\'s find words with its replace words, matching case (a match that starts the string keeps a capital first letter; mid-sentence stays lower case). Keep everything else, including numbering like "3. ".',
  '5. If several sweeps hit the same string, apply them in order and produce one edit.',
  `6. For kind "function", before and after are the template text with its \${…} placeholders. Keep every placeholder. Put "function: keep the placeholders" in note.`,
  `7. The Welsh ("cyAfter"). The Welsh policy is "${welsh}".`,
  `   - "mark": cyAfter is "${WELSH_NEEDED} " followed by the whole new English string, and welshNeeded is true.`,
  '   - "given": the sweep carries welshReplacement, the Welsh for its replace words. Replace the Welsh counterpart of the old words inside the current Welsh (cy) with it, and welshNeeded is false. Only when you cannot tell which Welsh words correspond, use the "mark" form, set welshNeeded to true and say why in note.',
  `   - If the current Welsh already carries ${WELSH_NEEDED}, the new Welsh is "${WELSH_NEEDED} " followed by the whole new English string, unless a Welsh replacement fits cleanly.`,
  '   cyBefore is the current Welsh string exactly as found.',
  '8. Group the edits by the folder that holds the copy files (the directory of file). One group per folder, with enFile (the copy.en.js path) and cyFile (the copy.cy.js path). Two groups never share a file.',
  '',
  'Do not read or change any files. Plan from the data below only.',
  '',
  'Sweeps and their find results (JSON):',
  JSON.stringify(sweepBriefs, null, 2)
].join('\n')

phase('Plan')

const plan = await judge(PLAN_PROMPT, {
  phase: 'Plan',
  label: 'plan the sweep',
  schema: PLAN_SCHEMA
})
if (!plan) {
  fail('the plan step did not answer.')
}

const edits = plan.groups.flatMap((group) => group.edits)
log(
  `${WORKFLOW_NAME}: ${edits.length} strings in ${plan.groups.length} feature folders; ${plan.skipped.length} skipped; ${plan.shared.length} in shared chrome`
)

// ---------------------------------------------------------------------------
// Edit: one builder per feature folder, so no two builders touch one file.

function editPrompt(group) {
  return [
    `Change the words in two copy files of the design release "${set}". Edit only these two files:`,
    `- English: ${group.enFile}`,
    `- Welsh: ${group.cyFile}`,
    '',
    'For each edit below, find the string at keyPath (a dotted path inside the exported copy object). In the English file replace "before" with "after". In the Welsh file replace "cyBefore" with "cyAfter".',
    'Rules:',
    '- Change only the text inside the quotes. Never rename, add or remove a key.',
    `- For a function string, keep the function, the values in its brackets and every \${…} placeholder.`,
    '- If new text contains a straight apostrophe, use a curly one (’) or switch that string to double quotes.',
    '- Keep the comments at the top of the files.',
    '- If the "before" text is not at that key, do not guess: report it as a problem.',
    'Read each file first, then use the Edit tool. Return the keyPaths you changed and any problems.',
    '',
    GUARD_RAILS,
    '',
    'Edits (JSON):',
    JSON.stringify(group.edits, null, 2)
  ].join('\n')
}

async function editGroup(group) {
  const result = await builder(editPrompt(group), {
    phase: 'Edit',
    label: `edit ${group.folder}`,
    schema: BUILD_SCHEMA
  })
  return {
    folder: group.folder,
    applied: result?.applied ?? [],
    problems: result ? result.problems : ['the edit step did not answer']
  }
}

const GAPS_PROMPT = [
  `Add rows to the design gaps log of the design release "${set}": src/server/app/sets/${set}/design-gaps.md.`,
  'Read .claude/skills/match-the-design/references/design-gaps.md first. If the log does not exist, create it with the heading and table header given there.',
  'Add one row per entry below, at the end of the table, in this form:',
  '| all pages | Change "<before>" to "<after>" | No change: shared chrome still says "<before>" | The words live in the shared chrome (<file>), which every set uses and the real service owns. | None |',
  'Escape any pipe character inside a cell as \\|. Change nothing else.',
  '',
  GUARD_RAILS,
  '',
  'Entries (JSON):',
  JSON.stringify(plan.shared, null, 2)
].join('\n')

async function logSharedChrome() {
  const result = await builder(GAPS_PROMPT, {
    phase: 'Edit',
    label: 'log shared chrome as design gaps',
    schema: BUILD_SCHEMA
  })
  return {
    folder: 'design-gaps.md',
    applied: result?.applied ?? [],
    problems: result ? result.problems : ['the design gaps step did not answer']
  }
}

phase('Edit')

const buildResults = []
for (const batch of inBatches(plan.groups, MAX_PARALLEL_BUILDERS)) {
  const results = await parallel(batch.map((group) => () => editGroup(group)))
  buildResults.push(...results.filter(Boolean))
}
if (plan.shared.length > 0) {
  buildResults.push(await logSharedChrome())
}

// ---------------------------------------------------------------------------
// Verify: the quick check, with at most MAX_REPAIRS repairs.

const CHECK_COMMAND = `npm run designer:check -- --set ${set} --quick`
const touchedFiles = plan.groups.flatMap((group) => [
  group.enFile,
  group.cyFile
])

function checkPrompt() {
  return [
    'Run this one command from the repository root and report the result:',
    '',
    CHECK_COMMAND,
    '',
    'Return passed (true only when it reports every check passed), a one-line summary, each failure as one plain sentence in failures, and the log path it prints (if any) in logPath.',
    '',
    GUARD_RAILS
  ].join('\n')
}

function runCheck(attempt) {
  return runner(checkPrompt(), {
    phase: 'Verify',
    label: attempt === 0 ? 'check' : `check again (${attempt})`,
    schema: CHECK_SCHEMA
  })
}

function repairPrompt(failedCheck) {
  return [
    `The quick check failed after a wording sweep in the design release "${set}". Repair it.`,
    'You may edit only these files:',
    ...touchedFiles.map((file) => `- ${file}`),
    '',
    'Usual causes: the English and Welsh files no longer have the same keys, a string became empty, a quote was left unbalanced, or a function lost its values. Fix the cause. Never delete a string to make the check pass.',
    'If the failure is in a file outside that list, change nothing and say so.',
    '',
    GUARD_RAILS,
    '',
    'Check output (JSON):',
    JSON.stringify(failedCheck, null, 2)
  ].join('\n')
}

phase('Verify')

let check = await runCheck(0)
let repairs = 0
while (check && !check.passed && repairs < MAX_REPAIRS) {
  repairs += 1
  await builder(repairPrompt(check), {
    phase: 'Verify',
    label: `repair ${repairs}`,
    schema: BUILD_SCHEMA
  })
  check = await runCheck(repairs)
}

const checkPassed = Boolean(check?.passed)
if (!checkPassed) {
  log(`${WORKFLOW_NAME}: the check still fails; the gallery is skipped`)
}

// ---------------------------------------------------------------------------
// Show: screenshots of every changed page, with error states for errors.

const changedErrors = edits.some(
  (edit) =>
    edit.keyPath.startsWith('errors.') || edit.keyPath.includes('.errors.')
)
const errorsFlag = changedErrors ? ' --errors' : ''
const SHOW_COMMAND = `npm run designer:show -- --set ${set} --pages changed${errorsFlag}`

const SHOW_PROMPT = [
  'Run this one command from the repository root and report the result:',
  '',
  SHOW_COMMAND,
  '',
  'Return ok, the gallery path it prints in galleryPath, and a one-line summary. Do not open the gallery.',
  '',
  GUARD_RAILS
].join('\n')

phase('Show')

const shown = checkPassed
  ? await runner(SHOW_PROMPT, {
      phase: 'Show',
      label: 'show the changed pages',
      schema: SHOW_SCHEMA
    })
  : null

const table = edits.map((edit) => ({
  page: edit.pages.join(', '),
  key: edit.keyPath,
  before: edit.before,
  after: edit.after,
  welshNeeded: edit.welshNeeded === true
}))

return {
  set,
  table,
  welshNeeded: table.filter((row) => row.welshNeeded).length,
  skipped: plan.skipped,
  sharedChrome: plan.shared,
  problems: buildResults.filter((result) => result.problems.length > 0),
  check: {
    passed: checkPassed,
    repairs,
    summary: check?.summary ?? 'the check did not answer'
  },
  gallery: shown?.galleryPath ?? null,
  next: checkPassed
    ? 'Tell the designer what changed on which pages, give the gallery path, and offer "npm run designer:words -- report <set>" to review the Welsh. Do not commit.'
    : 'Tell the designer the check still fails, list the problems, and offer to undo the sweep with share-my-change.'
}
