export const meta = {
  name: 'prepare-handoff',
  description:
    'Prepare a design release change for the real plants-frontend team: triage it, apply the ready part to high-risk-plants on a handoff/<slug> branch with its tests, prove it, and write the hand-off folder',
  whenToUse:
    'The hand-off skill, route 2 (upstream-bound). Launch by scriptPath with args { set, slug, scope, paths, includeDesignGaps }. Never pushes.',
  phases: [
    { title: 'Dry run', detail: 'designer:handoff --dry-run on the release' },
    {
      title: 'Triage',
      detail:
        'upstream-ready, needs a real service, design gap or research only'
    },
    {
      title: 'Apply',
      detail: 'handoff/<slug> branch from main, the patch and pinned tests'
    },
    {
      title: 'Verify',
      detail: 'npm test, lint, feature browser tests; at most 3 repairs'
    },
    {
      title: 'Show',
      detail: 'designer:show on high-risk-plants with --before'
    },
    { title: 'Write', detail: 'the hand-off folder and two commits' },
    { title: 'Return', detail: 'switch back to the designer branch' }
  ]
}

/* global agent, phase, log, args */

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

// The one place to point each kind of step at a model. A `runner` runs
// commands and reports what they printed, a `builder` edits code and tests,
// and a `judge` decides. Any model name the Workflow tool accepts goes here
// (Fable suits only the judge: see README.md, "Choosing models"); null uses
// the session's own model.
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }

const MAX_REPAIRS = 3
const REAL_JOURNEY = 'high-risk-plants'
const PLACEHOLDER = 'sample-journey'
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/

const WORKFLOW_NAME = meta.name
const REQUIRED_KEYS = ['set', 'slug', 'scope', 'paths', 'includeDesignGaps']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

function fail(message) {
  throw new Error(`${WORKFLOW_NAME}: ${message}`)
}

const isKebab = (value) => typeof value === 'string' && KEBAB.test(value)

if (!isKebab(config.set)) {
  fail('set must be a design release id, like "plants-working"')
}
if (config.set === REAL_JOURNEY) {
  fail(
    'set is high-risk-plants, the real service. Name the design release the change was made in'
  )
}
if (config.set === PLACEHOLDER) {
  fail('set is sample-journey, a placeholder with no real pages to hand over')
}
if (!isKebab(config.slug)) {
  fail(
    'slug must be lower-case words joined by hyphens, like "consignment-addresses"'
  )
}
const scopeIsList =
  Array.isArray(config.scope) &&
  config.scope.length > 0 &&
  config.scope.every(isKebab)
if (config.scope !== 'all' && !scopeIsList) {
  fail(
    'scope must be "all" or a list of feature folder names, like ["arrival-details"]'
  )
}
const pathsIsList =
  Array.isArray(config.paths) &&
  config.paths.every((item) => typeof item === 'string')
if (config.paths !== null && !pathsIsList) {
  fail('paths must be null (everything in scope) or a list of release files')
}
if (typeof config.includeDesignGaps !== 'boolean') {
  fail('includeDesignGaps must be true or false')
}

const { set, slug, scope, paths, includeDesignGaps } = config
const HANDOFF_BRANCH = `handoff/${slug}`
const SCOPE_FLAG = scope === 'all' ? '--all' : `--features ${scope.join(',')}`
const LOGS = '.cache/designer/handoff/logs'
const withModel = (role, opts) =>
  MODELS[role] ? { ...opts, model: MODELS[role] } : opts

const GUARD_RAILS = `GUARD RAILS
- Work from the root of the trade-imports-plants-prototype repository. Use repo-relative paths.
- One command per Bash call: no &&, ; or pipes. To keep long output, redirect it to a file under ${LOGS}/ and read that file.
- Never push, never open a pull request, never run git reset --hard, never rewrite history, never use --no-verify, never force anything.
- Never edit .claude/settings.json, .claude/settings.local.json or anything under .claude/hooks/.
- Never install packages. If node_modules is missing, stop and say so.
- Stage files by name with git add <path>. Never git add -A or git add .
- Nothing is ever pushed to plants-frontend: its push address is DISABLED on purpose.`

const DRY_RUN_SCHEMA = {
  type: 'object',
  properties: {
    startBranch: { type: 'string' },
    clean: { type: 'boolean' },
    handoffBranchExists: { type: 'boolean' },
    folder: { type: 'string' },
    report: { type: 'object' },
    problem: { type: 'string' }
  },
  required: [
    'startBranch',
    'clean',
    'handoffBranchExists',
    'folder',
    'report',
    'problem'
  ]
}

const TRIAGE_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'upstream-ready',
              'needs-real-service',
              'design-gap',
              'research-only'
            ]
          },
          reason: { type: 'string' }
        },
        required: ['path', 'category', 'reason']
      }
    },
    upstreamReady: { type: 'array', items: { type: 'string' } },
    why: { type: 'string' },
    title: { type: 'string' }
  },
  required: ['items', 'upstreamReady', 'why', 'title']
}

const STEP_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    changedFiles: { type: 'array', items: { type: 'string' } }
  },
  required: ['ok', 'summary', 'changedFiles']
}

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    failures: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          summary: { type: 'string' },
          logPath: { type: 'string' }
        },
        required: ['command', 'summary', 'logPath']
      }
    }
  },
  required: ['passed', 'failures']
}

const stopped = (reason, extra = {}) => ({
  status: 'stopped',
  reason,
  ...extra
})

const HANDOFF_COMMAND = `npm run designer:handoff -- --set ${set} ${SCOPE_FLAG} --slug ${slug} --dry-run`

phase('Dry run')
const dryRun = await agent(
  `${GUARD_RAILS}

Prepare a dry run of a hand-off. Change nothing. Do these in order:

1. Run \`git branch --show-current\`. That is startBranch.
2. Run \`git status --porcelain\`. clean is true only when it prints nothing.
3. Run \`git branch --list ${HANDOFF_BRANCH}\`. handoffBranchExists is true when it prints a line.
4. Run \`${HANDOFF_COMMAND}\`. If npm says the script is missing, run \`node scripts/designer/handoff/cli.js --set ${set} ${SCOPE_FLAG} --slug ${slug} --dry-run\` instead.
5. Its output starts "Hand-off written to <folder>/". folder is that path. Read <folder>/report.json and return its whole content as report.

problem is "" when all of that worked, otherwise one plain sentence saying what went wrong, quoting the error.`,
  withModel('runner', { label: 'dry run', schema: DRY_RUN_SCHEMA })
)

if (!dryRun) {
  return stopped('The dry run did not finish.')
}
if (dryRun.problem) {
  return stopped(dryRun.problem)
}
if (!dryRun.clean) {
  return stopped(
    'There are unsaved changes. Save them with share-my-change, or undo them, before preparing a hand-off.'
  )
}
if (dryRun.handoffBranchExists) {
  return stopped(
    `${HANDOFF_BRANCH} already exists. Choose another slug, or finish the hand-off on that branch.`
  )
}
if (dryRun.startBranch.startsWith('handoff/')) {
  return stopped(
    'You are on a handoff branch already. Switch back to your design branch first.'
  )
}
const changedFiles = dryRun.report.files ?? []
if (changedFiles.length === 0) {
  return stopped(
    'Nothing in the release differs from the real journey, so there is nothing to hand over.',
    { dryRun: dryRun.folder }
  )
}
log(
  `${changedFiles.length} file(s) differ from the real journey; ${(dryRun.report.leftOut ?? []).length} left out of the patch`
)

const candidates = paths
  ? `Only these release files are candidates; everything else is out of scope for this hand-off: ${JSON.stringify(paths)}.`
  : 'Every file in report.json "files" is a candidate.'

phase('Triage')
const triage = await agent(
  `${GUARD_RAILS}

Decide which parts of a designer's change can go to the real plants-frontend team now.

The dry-run hand-off is in ${dryRun.folder}/: read report.json, upstream.patch and brief.md. The design release is src/server/app/sets/${set}/; the real journey is src/server/app/sets/${REAL_JOURNEY}/.
${candidates}
Design gaps ${includeDesignGaps ? 'DO' : 'do NOT'} travel with this hand-off.

Put every candidate file, every report.leftOut entry and every report.cannotShip entry into exactly one category:
- upstream-ready: works in the real service as it is: real GOV.UK components, real copy, real flow, no prototype-only imports. A "[Welsh needed]" marker does not stop a file being upstream-ready; the brief lists it.
- needs-real-service: depends on prototype-services or prototype-data, or on data the real backend does not have.
- design-gap: something the GOV.UK toolbox could not build (a row in the release's design-gaps.md).
- research-only: a research-mode relaxation, or anything made only for a research session.

Read the patch hunks, not just the file names: a template showing a pretend service's data is needs-real-service even without an import.
upstreamReady lists the real-journey paths (the "path" field of report.files, under src/server/app/sets/${REAL_JOURNEY}/) that are upstream-ready.
why is one or two plain-English sentences a plants-frontend developer would understand: what the change does and why the designer made it. title is a short heading for the brief.`,
  withModel('judge', { label: 'triage', schema: TRIAGE_SCHEMA })
)
if (!triage) {
  return stopped('Triage did not finish.', { dryRun: dryRun.folder })
}
log(
  `triage: ${triage.upstreamReady.length} upstream-ready of ${triage.items.length} item(s)`
)
if (triage.upstreamReady.length === 0) {
  return stopped(
    'Nothing is ready for the real service yet. Use route 1 (a brief and patch from the design release) instead.',
    { triage: triage.items, dryRun: dryRun.folder }
  )
}

const INCLUDES = triage.upstreamReady
  .map((file) => `--include=${file}`)
  .join(' ')
const PARK = `If you cannot finish, do not leave the branch half-changed and do not delete anything: run \`git stash push --include-untracked -m "prepare-handoff ${slug}: unfinished"\`, then \`git switch ${dryRun.startBranch}\`, and set ok to false with the reason.`

phase('Apply')
const applied = await agent(
  `${GUARD_RAILS}

Apply the upstream-ready part of a designer's change to the real journey, on its own branch, with its tests.

1. Run \`git switch -c ${HANDOFF_BRANCH} main\`.
2. Run \`git apply --3way ${INCLUDES} ${dryRun.folder}/upstream.patch\`. If a hunk conflicts, keep the real journey's newer code and apply the designer's intent on top. Afterwards no file may contain conflict markers.
3. report.json "testImpact" in ${dryRun.folder}/ lists tests that still expect the old words. Update each one that belongs to a file you applied so it expects the new words. Then search the unit tests (*.test.js) and browser tests (*.fit.spec.js and fit/) under src/server/app/sets/${REAL_JOURNEY}/ for any other place pinning a changed string, section caption or label, and update those too. Change what a test expects, never what it checks.
4. If a page, field or rule was added, follow the matching recipe in src/server/app/sets/${REAL_JOURNEY}/docs/ in full, including the tests it asks for.
5. Touch nothing outside src/server/app/sets/${REAL_JOURNEY}/ and fit/. Do not commit.

${PARK}

Return ok, a plain summary, and changedFiles: every path \`git status --porcelain\` lists.`,
  withModel('builder', { label: 'apply', schema: STEP_SCHEMA })
)
if (!applied || !applied.ok) {
  return stopped(
    applied ? applied.summary : 'Applying the change did not finish.',
    {
      triage: triage.items
    }
  )
}

const verifyPrompt = (attempt) => `${GUARD_RAILS}

Run the real service's checks on the ${HANDOFF_BRANCH} branch (attempt ${attempt}). Fix nothing. First run \`mkdir -p ${LOGS}\`. Then run each command on its own, and read its log:

1. \`npm test > ${LOGS}/${slug}-test-${attempt}.log 2>&1\`
2. \`npm run lint > ${LOGS}/${slug}-lint-${attempt}.log 2>&1\`
3. \`npm run test:fit:features > ${LOGS}/${slug}-fit-${attempt}.log 2>&1\`

passed is true only when all three succeed. For each failure give the command, a short summary naming the failing test or rule and its file, and the log path.`

const repairPrompt = (failures) => `${GUARD_RAILS}

The checks failed on the ${HANDOFF_BRANCH} branch. Fix the cause, not the check:
${JSON.stringify(failures, null, 2)}

Read each log. Only change files under src/server/app/sets/${REAL_JOURNEY}/ and fit/. Update a test only where it pins wording or structure the designer deliberately changed. Never weaken what a test checks, never skip or delete a test. Do not commit. Return ok, a plain summary and changedFiles.`

phase('Verify')
let verdict = await agent(
  verifyPrompt(1),
  withModel('runner', { label: 'verify 1', schema: VERIFY_SCHEMA })
)
let repairs = 0
while (verdict && !verdict.passed && repairs < MAX_REPAIRS) {
  repairs += 1
  log(`the checks failed; repair ${repairs} of ${MAX_REPAIRS}`)
  const repaired = await agent(
    repairPrompt(verdict.failures),
    withModel('builder', { label: `repair ${repairs}`, schema: STEP_SCHEMA })
  )
  if (!repaired || !repaired.ok) {
    break
  }
  verdict = await agent(
    verifyPrompt(repairs + 1),
    withModel('runner', {
      label: `verify ${repairs + 1}`,
      schema: VERIFY_SCHEMA
    })
  )
}
if (!verdict || !verdict.passed) {
  await agent(
    `${GUARD_RAILS}

The change could not be made to pass the real service's checks. Park the work safely:
1. \`git stash push --include-untracked -m "prepare-handoff ${slug}: checks failing"\`
2. \`git switch ${dryRun.startBranch}\`
3. \`git status --porcelain\` must print nothing.
Say what you did in one sentence.`,
    withModel('runner', { label: 'park' })
  )
  return stopped(
    `The real service's checks still fail after ${repairs} repair(s). The work is stashed as "prepare-handoff ${slug}: checks failing" and ${HANDOFF_BRANCH} is kept. Ask a developer to look.`,
    { failures: verdict ? verdict.failures : [], triage: triage.items }
  )
}

phase('Show')
const shown = await agent(
  `${GUARD_RAILS}

Photograph the real journey's changed pages before and after, on the ${HANDOFF_BRANCH} branch. The change is not committed yet, so "before" is main.
Run \`npm run designer:show -- --set ${REAL_JOURNEY} --pages changed --before\`. It prints where the gallery is. Look at two or three of the PNGs and describe in one or two sentences what changed on screen. Return ok, that description as summary, and changedFiles as [].`,
  withModel('runner', { label: 'show', schema: STEP_SCHEMA })
)

const plain = (text) => text.replaceAll('"', "'")
const title = plain(triage.title)
const why = plain(triage.why)
const gapsFlag = includeDesignGaps ? ` --gaps-from ${set}` : ''
const parked = triage.items.filter((item) => item.category !== 'upstream-ready')

phase('Write')
const written = await agent(
  `${GUARD_RAILS}

Write the hand-off folder and save the work on the ${HANDOFF_BRANCH} branch.

1. Run \`npm run designer:handoff -- --set ${REAL_JOURNEY} --base main --slug ${slug} --title "${title}" --why "${why}"${gapsFlag}\`.
2. Read the brief.md it wrote. The pinned tests section should say "None found" (they were updated); if it lists any, update those tests and run step 1 again. If any items were parked, add a section "## Not in this hand-off" to brief.md and brief.jira.txt listing each with its reason:
${JSON.stringify(parked, null, 2)}
3. Run \`npm run designer:format\`.
4. Stage the real-journey change: \`git add <path>\` for each changed path under src/server/app/sets/${REAL_JOURNEY}/ and fit/ that \`git status --porcelain\` lists.
5. Save it: \`npm run designer:save -- -m "${title} (from design release ${set})"\`. The pre-commit checks run; it prints one line, or "Nothing was saved" and the end of the log. If they fail, fix only formatting and try once more.
6. Stage the folder with \`git add handoffs/<folder>\` and save it: \`npm run designer:save -- -m "Hand-off brief: ${title}"\`.
7. \`git status --porcelain\` must print nothing.

${PARK}

Return ok, a summary naming the folder and both commits, and changedFiles.`,
  withModel('builder', { label: 'write', schema: STEP_SCHEMA })
)

phase('Return')
const back = await agent(
  `${GUARD_RAILS}

Run \`git switch ${dryRun.startBranch}\`, then \`git status --porcelain\` (it must print nothing), then \`git log --oneline -3 ${HANDOFF_BRANCH}\`. Return ok and a one-line summary.`,
  withModel('runner', { label: 'switch back', schema: STEP_SCHEMA })
)

return {
  status: written && written.ok ? 'ready' : 'stopped',
  handoffBranch: HANDOFF_BRANCH,
  startBranch: dryRun.startBranch,
  repairs,
  triage: triage.items,
  shown: shown ? shown.summary : null,
  written: written ? written.summary : null,
  back: back ? back.summary : null,
  next: `Nothing was pushed. The brief and patch are on ${HANDOFF_BRANCH} under handoffs/. Give them to the plants-frontend team, or ask before sending ${HANDOFF_BRANCH} to GitHub so a developer can fetch it. Never merge ${HANDOFF_BRANCH} into the prototype's main: once plants-frontend merges the change, the weekly update brings it in.`
}
