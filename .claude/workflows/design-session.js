export const meta = {
  name: 'design-session',
  description:
    'Work through a list of design requests in one design release: route each to its skill, build it, check it, show the whole session in one gallery, and save each landed request as its own commit',
  whenToUse:
    'Several changes to one design release in one go, such as notes from a crit or a feedback round. Launch by scriptPath with args {set, requests}; both are required. Never pushes.',
  phases: [
    {
      title: 'Classify',
      detail: 'the release is yours; each request gets a skill and its pages'
    },
    {
      title: 'Prepare',
      detail: 'no unsaved changes; a design/<set>-<slug> branch'
    },
    {
      title: 'Build',
      detail: 'one request at a time: build, check, one repair, else park'
    },
    {
      title: 'Show',
      detail: 'designer:show --pages changed --before for the whole session'
    },
    { title: 'Save', detail: 'a full check, then one commit per request' }
  ]
}

/* global agent, args, log, phase */

// The one place to choose models. A `runner` only runs commands and reports
// what they printed, a `builder` edits files by following a skill, and a
// `judge` reads and decides. Point any of them at another model (a Fable
// model suits the runner) by changing its name here; null means "use the
// session's own model".
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
const REQUIRED_KEYS = ['set', 'requests']
const config = parseArgs(WORKFLOW_NAME, args)
requireKeys(WORKFLOW_NAME, config, REQUIRED_KEYS)
logResolvedConfig(WORKFLOW_NAME, config)

const NOT_RELEASES = ['high-risk-plants', 'sample-journey']
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/
const MAX_SLUG_WORDS = 5

// The skills a session can run for a request. Each one changes a design
// release in place and leaves checking, showing and saving to this workflow.
const SESSION_SKILLS = [
  'change-the-words',
  'match-the-design',
  'change-the-journey',
  'example-data',
  'fake-a-service'
]

// check-my-change's rule: words, layout and examples need the quick check;
// flow, model and service changes need the full one.
const CHECK_LEVEL = {
  'change-the-words': 'quick',
  'match-the-design': 'quick',
  'example-data': 'quick',
  'change-the-journey': 'full',
  'fake-a-service': 'full'
}

const refuse = (reason) => {
  throw new Error(`${WORKFLOW_NAME}: ${reason}`)
}

if (typeof config.set !== 'string' || !KEBAB.test(config.set)) {
  refuse(
    `set must be a design release id such as plants-working, not "${config.set}"`
  )
}
if (NOT_RELEASES.includes(config.set)) {
  refuse(
    `${config.set} is not a design release. Run the session in a working release instead (the design-release skill makes one)`
  )
}
if (
  !Array.isArray(config.requests) ||
  config.requests.length === 0 ||
  config.requests.some(
    (request) => typeof request !== 'string' || request.trim() === ''
  )
) {
  refuse('requests must be a list of at least one request, each in words')
}

const SET_DIR = `src/server/app/sets/${config.set}`

const GUARD_RAILS = [
  'GUARD RAILS:',
  '- Run one Bash command per call: no &&, ;, | or cd.',
  `- Change files only under ${SET_DIR}/, src/server/app/routes-${config.set}.js, src/server/prototype-seed/scenarios/${config.set}.js, src/server/prototype-seed/fixtures/${config.set}/, src/server/prototype-data/${config.set}/ and src/server/prototype-services/, and only when your step says to change files.`,
  '- Never change *.scss, src/client/**, webpack.config.js, src/server/app/shared/**, .claude/settings.json or any other set.',
  '- Never add *.test.js or *.fit.spec.js files to a design release.',
  '- Never push, never run git reset, never use --no-verify.',
  '- Never ask the designer a question: you are running unattended.'
].join('\n')

const withModel = (tier, opts) =>
  MODELS[tier] ? { ...opts, model: MODELS[tier] } : opts

const CLASSIFY_SCHEMA = {
  type: 'object',
  properties: {
    releaseOk: { type: 'boolean' },
    releaseReason: { type: 'string' },
    sessionSlug: { type: 'string' },
    requests: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          skill: { type: 'string' },
          pages: { type: 'array', items: { type: 'string' } },
          refused: { type: 'boolean' },
          reason: { type: 'string' }
        },
        required: ['index', 'skill', 'pages', 'refused', 'reason']
      }
    }
  },
  required: ['releaseOk', 'releaseReason', 'sessionSlug', 'requests']
}

const PREPARE_SCHEMA = {
  type: 'object',
  properties: {
    ready: { type: 'boolean' },
    branch: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['ready', 'branch', 'reason']
}

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    built: { type: 'boolean' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    recipe: { type: 'string' },
    welshNeeded: { type: 'boolean' },
    notes: { type: 'string' }
  },
  required: ['built', 'filesChanged', 'recipe', 'welshNeeded', 'notes']
}

const CHECK_SCHEMA = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    summary: { type: 'string' },
    logPath: { type: 'string' },
    changed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          owner: { type: 'string' }
        },
        required: ['path', 'owner']
      }
    }
  },
  required: ['passed', 'summary', 'logPath', 'changed']
}

const DONE_SCHEMA = {
  type: 'object',
  properties: {
    done: { type: 'boolean' },
    reason: { type: 'string' }
  },
  required: ['done', 'reason']
}

const SHOW_SCHEMA = {
  type: 'object',
  properties: {
    ran: { type: 'boolean' },
    galleryPath: { type: 'string' },
    pagesShown: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' }
  },
  required: ['ran', 'galleryPath', 'pagesShown', 'summary']
}

const COMMIT_SCHEMA = {
  type: 'object',
  properties: {
    committed: { type: 'boolean' },
    commit: { type: 'string' },
    message: { type: 'string' },
    reason: { type: 'string' }
  },
  required: ['committed', 'commit', 'message', 'reason']
}

const numbered = (requests) =>
  requests.map((request, index) => `${index + 1}. ${request}`).join('\n')

const classify = () =>
  agent(
    [
      `A designer has asked for these changes to the design release "${config.set}":`,
      numbered(config.requests),
      '',
      'Step 1. Check the release is one this session may change.',
      `Run: npm run designer:where -- ${SET_DIR}/set.js`,
      'releaseOk is false when the answer does not start with "Yours", when it says the release is frozen, or when the set does not exist. Put the plain reason in releaseReason.',
      '',
      'Step 2. Route each request to exactly one skill.',
      'Read the "Routing" table in CLAUDE.md, then the description of each of these skills in .claude/skills/<skill>/SKILL.md:',
      SESSION_SKILLS.join(', '),
      'For each request return: index (1-based), skill (one of the names above), pages (the page addresses it changes, for example arrival-details; use the flow in the release to find them) and refused.',
      'Set refused to true, with a plain reason a designer understands, when the request:',
      '- needs a skill that is not in the list (a new release, research mode, saving or sharing, handing off, re-creating an old Prototype Kit page, running, checking or showing),',
      '- asks to change the real journey (high-risk-plants) or anything every set shares,',
      '- is too vague to build without asking the designer something.',
      'When refused is true, set skill to "none".',
      '',
      'Step 3. Suggest sessionSlug: 2 to 4 lower-case words joined by hyphens that sum up the session, for example crit-notes-oct.',
      'Change nothing.'
    ].join('\n'),
    withModel('judge', {
      label: 'classify',
      phase: 'Classify',
      schema: CLASSIFY_SCHEMA
    })
  )

const prepare = (slug) =>
  agent(
    [
      'Get the git branch ready for a design session. Change no files.',
      '1. Run: git status --porcelain',
      "   If it prints anything, stop: ready is false and reason is \"You have unsaved changes. Save them or undo them first (say 'save my work' or 'undo that'), then start the session again.\"",
      '2. Run: git branch --show-current',
      '   - If the branch starts with design/, stay on it.',
      `   - If it is main, run: git switch -c design/${config.set}-${slug}`,
      '     If git says the branch already exists, stop: ready is false and reason names the branch and asks the designer to switch to it or pick another name.',
      '   - Otherwise stop: ready is false and reason is "A design session runs on main or on a design/ branch. You are on <branch>."',
      '3. Run: git branch --show-current, and return the branch name in branch.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'prepare',
      phase: 'Prepare',
      schema: PREPARE_SCHEMA
    })
  )

const build = (request, route) =>
  agent(
    [
      `Make one change in the design release "${config.set}". The designer asked:`,
      `"${request}"`,
      `Follow .claude/skills/${route.skill}/SKILL.md. The pages involved are likely: ${route.pages.join(', ') || 'not known yet'}.`,
      'How to follow the skill in this session:',
      '- Do the steps that find, plan and make the change, including its ownership step (designer:where) and any reference or recipe it tells you to read.',
      '- Skip the steps that check, show, save, share or hand off. This workflow does those for every request.',
      '- When the skill says to confirm something with the designer, take the request as confirmed.',
      '- When you cannot make the change without an answer only the designer has, change nothing and return built false with the question in notes.',
      "- New words go in copy.en.js, and the same key in copy.cy.js as '[Welsh needed] <English>' unless the designer gave the Welsh.",
      '- Run npm run format when you have finished editing.',
      'Return built, every file you created or changed (repo-relative paths), the recipe you followed (its file name, such as add-a-field or move-a-page, or "none"), whether you added any [Welsh needed] marker, and notes in one or two plain sentences.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: `build ${route.index}`,
      phase: 'Build',
      schema: BUILD_SCHEMA
    })
  )

const check = (label, level) =>
  agent(
    [
      `1. Run: npm run designer:check -- --set ${config.set} --${level}`,
      '   Report whether it passed, its plain-English summary (every failing row in full) and the log path it prints.',
      '2. Run: npm run designer:where -- --changed --json',
      "   The JSON comes after npm's own first lines. Return every record as { path, owner } in changed.",
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label, phase: 'Build', schema: CHECK_SCHEMA })
  )

const repair = (request, route, failure) =>
  agent(
    [
      `The check of the design release "${config.set}" failed after this request was built:`,
      `"${request}"`,
      `Summary: ${failure.summary}`,
      `Full log: ${failure.logPath} (read it).`,
      `Fix the cause in the files this request changed, following .claude/skills/${route.skill}/SKILL.md and .claude/skills/check-my-change/SKILL.md. If the failure is in a file this request did not touch, change nothing and say so in notes.`,
      'Run npm run format when you have finished. Return what you changed.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: `repair ${route.index}`,
      phase: 'Build',
      schema: BUILD_SCHEMA
    })
  )

const stage = (index, paths) =>
  agent(
    [
      `Keep the files of request ${index} aside from the requests that follow, without saving a commit.`,
      `Run: git add -- ${paths.join(' ')}`,
      'Then run: git status --porcelain',
      'done is true when every one of those paths shows in the first column. Change nothing else.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: `keep ${index}`,
      phase: 'Build',
      schema: DONE_SCHEMA
    })
  )

const putAway = (index, request, paths) =>
  agent(
    [
      `Request ${index} ("${request}") is parked. Undo only its edits, so the requests already kept stay as they are.`,
      `1. Run: git status --porcelain=v1 -uall -- ${paths.join(' ')}`,
      `2. Lines starting "??" are new files. Put them all away in one go, so they can come back later: git stash push --include-untracked -m "design-session parked: request ${index}" -- <those paths>`,
      '3. For every other path from step 1, run: git restore --worktree -- <path>',
      '   This puts back the version kept by an earlier request, or the saved version.',
      `4. Run step 1's command again. done is true when no line has a second-column change and no line starts with "??".`,
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: `put away ${index}`,
      phase: 'Build',
      schema: DONE_SCHEMA
    })
  )

const show = () =>
  agent(
    [
      `Run: npm run designer:show -- --set ${config.set} --pages changed --before`,
      'Report the gallery folder it prints (the index.html path), the pages it pictured and its summary, including any "None of your changes show on a page" or page-health note, word for word.',
      'Do not describe what the pictures look like. Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', { label: 'show', phase: 'Show', schema: SHOW_SCHEMA })
  )

const fullCheck = () =>
  agent(
    [
      `Run: npm run designer:check -- --set ${config.set} --full`,
      'This is what the pre-commit hook runs. Report whether it passed, its plain-English summary (every failing row in full) and the log path. Return changed as an empty list.',
      'Change nothing.',
      GUARD_RAILS
    ].join('\n'),
    withModel('runner', {
      label: 'full check',
      phase: 'Save',
      schema: CHECK_SCHEMA
    })
  )

const commit = (group) =>
  agent(
    [
      `Save one commit for ${group.requests.length === 1 ? 'this request' : 'these requests, which changed the same files'}:`,
      group.requests
        .map((item) => `- "${item.request}" (${item.skill})`)
        .join('\n'),
      `Files: ${group.paths.join(' ')}`,
      `Recipes followed: ${group.recipes.join(', ') || 'none'}`,
      '1. Read .claude/skills/share-my-change/references/commit-message.md and follow it exactly.',
      `2. Run: git diff --cached -- ${group.paths.join(' ')}`,
      '   Write the message from that change, never from the request text alone.',
      `3. Run: git commit -m "<first line>" -m "<body>" -- ${group.paths.join(' ')}`,
      "   The pre-commit hook runs the full check. Never add --no-verify. If the commit fails, change nothing and return committed false with the hook's plain reason.",
      '4. Run: git log -1 --format=%h and return it in commit, with the whole message in message.',
      GUARD_RAILS
    ].join('\n'),
    withModel('builder', {
      label: `save ${group.requests.map((item) => item.index).join('+')}`,
      phase: 'Save',
      schema: COMMIT_SCHEMA
    })
  )

const sessionSlugFrom = (suggested) => {
  const words = String(suggested ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .split('-')
    .filter(Boolean)
    .slice(0, MAX_SLUG_WORDS)
  return words.length > 0 ? words.join('-') : 'design-session'
}

const routeFor = (classified, index) => {
  const route = (classified.requests ?? []).find((item) => item.index === index)
  if (!route) {
    return {
      index,
      skill: 'none',
      pages: [],
      refused: true,
      reason: 'The request could not be matched to a skill.'
    }
  }
  if (!route.refused && !SESSION_SKILLS.includes(route.skill)) {
    return {
      ...route,
      refused: true,
      reason: `"${route.skill}" is not a skill a design session can run.`
    }
  }
  return route
}

const pathsOf = (records) => records.map((record) => record.path)

const notYours = (records) =>
  records.filter((record) => record.owner !== 'yours')

// Requests that changed a file in common are saved in one commit, because
// git cannot split one file's changes between two commits here.
const groupByFiles = (landed) => {
  const groups = []
  for (const item of landed) {
    const overlapping = groups.filter((group) =>
      group.paths.some((filePath) => item.paths.includes(filePath))
    )
    const merged = {
      requests: [...overlapping.flatMap((group) => group.requests), item],
      paths: [
        ...new Set([
          ...overlapping.flatMap((group) => group.paths),
          ...item.paths
        ])
      ],
      recipes: [
        ...new Set([
          ...overlapping.flatMap((group) => group.recipes),
          ...(item.recipe && item.recipe !== 'none' ? [item.recipe] : [])
        ])
      ]
    }
    for (const group of overlapping) {
      groups.splice(groups.indexOf(group), 1)
    }
    groups.push(merged)
  }
  return groups.sort(
    (left, right) => left.requests[0].index - right.requests[0].index
  )
}

const buildOne = async (request, route, alreadyChanged) => {
  const built = await build(request, route)
  if (!built?.built) {
    return {
      landed: false,
      paths: built?.filesChanged ?? [],
      reason: built?.notes || 'The change could not be made.'
    }
  }
  const level = CHECK_LEVEL[route.skill]
  let checked = await check(`check ${route.index}`, level)
  if (checked && !checked.passed) {
    log(`Request ${route.index} failed its check. One repair.`)
    await repair(request, route, checked)
    checked = await check(`recheck ${route.index}`, level)
  }
  const changedNow = checked?.changed ?? []
  const paths = [
    ...new Set([
      ...built.filesChanged,
      ...pathsOf(changedNow).filter(
        (filePath) => !alreadyChanged.includes(filePath)
      )
    ])
  ]
  if (!checked?.passed) {
    return {
      landed: false,
      paths,
      reason: `It still fails its check after one repair: ${checked?.summary ?? 'the check did not answer'}`
    }
  }
  const strays = notYours(
    changedNow.filter((record) => paths.includes(record.path))
  )
  if (strays.length > 0) {
    return {
      landed: false,
      paths,
      reason: `It changed files that are not yours: ${pathsOf(strays).join(', ')}.`
    }
  }
  return {
    landed: true,
    paths,
    recipe: built.recipe,
    welshNeeded: built.welshNeeded,
    reason: built.notes
  }
}

const statusLine = (item) => {
  if (item.status === 'landed') {
    return `${item.index}. Landed (${item.skill})${item.commit ? `, saved as ${item.commit}` : ', not saved'}: ${item.request}`
  }
  return `${item.index}. ${item.status === 'parked' ? 'Parked' : 'Not done'}: ${item.request}. ${item.reason}`
}

const summarise = (results, extra) => {
  log(
    [
      `Design session in ${config.set}:`,
      ...results.map(statusLine),
      ...extra
    ].join('\n')
  )
}

const saveGroups = async (groups, results) => {
  for (const group of groups) {
    const saved = await commit(group)
    if (!saved?.committed) {
      return `Saving stopped: ${saved?.reason ?? 'the commit step did not answer'}. The remaining changes are kept but not saved; say "check my changes".`
    }
    for (const item of group.requests) {
      results[item.index - 1].commit = saved.commit
    }
  }
  return `Saved ${groups.length} commit${groups.length === 1 ? '' : 's'}. Nothing was pushed: say "share this" to open a pull request.`
}

const buildAll = async (routes) => {
  const results = []
  const kept = []
  for (const [position, request] of config.requests.entries()) {
    const route = routes[position]
    const base = { index: position + 1, request, skill: route.skill }
    if (route.refused) {
      results.push({ ...base, status: 'refused', reason: route.reason })
      continue
    }
    log(`Request ${base.index} of ${config.requests.length}: ${route.skill}`)
    const outcome = await buildOne(request, route, kept)
    if (outcome.landed) {
      const staged = await stage(base.index, outcome.paths)
      if (staged?.done) {
        kept.push(...outcome.paths)
        results.push({ ...base, status: 'landed', ...outcome })
        continue
      }
      outcome.reason = `Its files could not be kept aside: ${staged?.reason ?? 'no answer'}`
    }
    if (outcome.paths.length > 0) {
      await putAway(base.index, request, outcome.paths)
    }
    results.push({ ...base, status: 'parked', reason: outcome.reason })
  }
  return results
}

const main = async () => {
  phase('Classify')
  const classified = await classify()
  if (!classified) {
    log('Stopped before any change: the classify step did not answer.')
    return
  }
  if (!classified.releaseOk) {
    log(`Stopped before any change: ${classified.releaseReason}`)
    return
  }
  const routes = config.requests.map((_, position) =>
    routeFor(classified, position + 1)
  )
  if (routes.every((route) => route.refused)) {
    summarise(
      config.requests.map((request, position) => ({
        index: position + 1,
        request,
        status: 'refused',
        reason: routes[position].reason
      })),
      ['Nothing was changed.']
    )
    return
  }

  phase('Prepare')
  const prepared = await prepare(sessionSlugFrom(classified.sessionSlug))
  if (!prepared?.ready) {
    log(
      `Stopped before any change: ${prepared?.reason ?? 'the prepare step did not answer'}`
    )
    return
  }
  log(`Working on branch ${prepared.branch}.`)

  phase('Build')
  const results = await buildAll(routes)
  const landed = results.filter((item) => item.status === 'landed')
  if (landed.length === 0) {
    summarise(results, ['Nothing landed, so there is no gallery or commit.'])
    return
  }

  phase('Show')
  const shown = await show()
  const gallery = shown?.ran
    ? `Gallery: ${shown.galleryPath}`
    : `No gallery: ${shown?.summary ?? 'the show step did not answer'}`

  phase('Save')
  const checked = await fullCheck()
  if (!checked?.passed) {
    summarise(results, [
      gallery,
      `Not saved: the full check failed (${checked?.summary ?? 'no answer'}). The landed changes are kept but not saved; say "check my changes".`
    ])
    return
  }
  const saving = await saveGroups(groupByFiles(landed), results)
  summarise(results, [gallery, `Branch: ${prepared.branch}`, saving])
}

await main()
