/**
 * Which pages to show, and how to reach each one. Pure: the set's flow pages
 * (from `pagesOf`) and its example scenarios in, a walk plan out.
 *
 * How a page is reached:
 * - The set's first page (the dashboard) is its landing page: a plain visit
 *   to the set's address. When the set has examples it is shown last, so it
 *   has notifications on it.
 * - A page an example fills in is shown when the first example that fills it
 *   in gets there.
 * - The hub (the task list) is shown once the first example has answered
 *   every step.
 * - Pages after the last page an example fills in (check your answers, the
 *   declaration, confirmation) are reached by carrying on from the hub.
 * - Anything else is a page no example reaches.
 */

export const HUB_KEY = 'hub'

/**
 * A page's name in designer:show: its address inside a notification
 * (`arrival-details`, `commodities/details`), or its id when it has no
 * address of its own (`dashboard`, `hub`).
 */
export const pageKey = (page) => (page.slug ? page.slug : page.id)

const ALIASES = Object.freeze({
  'check-answers': 'notification-view',
  'check-your-answers': 'notification-view',
  'task-list': HUB_KEY,
  overview: HUB_KEY,
  home: 'dashboard',
  start: 'dashboard'
})

/**
 * Every page name a set answers to, in journey order. With examples, the hub
 * sits straight after the last page an example fills in: that is where a
 * trader lands when they have answered everything.
 */
export const knownKeys = (pages, scenarios) => {
  const keys = [...new Set(pages.map(pageKey))].filter((key) => key !== HUB_KEY)
  if (scenarios.length === 0) {
    return keys
  }
  const filled = new Set(
    scenarios.flatMap((scenario) => scenario.steps.map((step) => step.slug))
  )
  const lastFilled = keys.reduce(
    (last, key, index) => (filled.has(key) ? index : last),
    -1
  )
  keys.splice(lastFilled + 1, 0, HUB_KEY)
  return keys
}

/**
 * The page a designer means by `name`: an exact page name, a page id
 * (`arrivalDetails`), a file-name form (`commodities-details`), or a plain
 * alias (`check-answers`, `task-list`). Null when nothing matches.
 */
export const resolvePageName = (name, pages, scenarios) => {
  const keys = knownKeys(pages, scenarios)
  const wanted = String(name)
    .trim()
    .replace(/^\/+|\/+$/g, '')
  if (keys.includes(wanted)) {
    return wanted
  }
  const alias = ALIASES[wanted.toLowerCase()]
  if (alias && keys.includes(alias)) {
    return alias
  }
  const byId = pages.find((page) => page.id === wanted)
  if (byId) {
    return pageKey(byId)
  }
  const byFileName = keys.find((key) => key.replaceAll('/', '-') === wanted)
  return byFileName ?? null
}

/**
 * The page names to show for a `--pages` choice.
 *
 * @param {{ mode: string, keys: string[] }} choice - from parsePages.
 * @param {object} context - `{ pages, scenarios, changedKeys, setId }`.
 * @returns {{ keys: string[], problems: string[] }}
 */
export const resolveWanted = (choice, context) => {
  const { pages, scenarios, changedKeys = [], setId } = context
  const keys = knownKeys(pages, scenarios)
  if (choice.mode === 'all') {
    return { keys, problems: [] }
  }
  if (choice.mode === 'changed') {
    return {
      keys: keys.filter((key) => changedKeys.includes(key)),
      problems: []
    }
  }
  const problems = []
  const resolved = []
  for (const name of choice.keys) {
    const key = resolvePageName(name, pages, scenarios)
    if (key) {
      resolved.push(key)
    } else {
      problems.push(
        `There is no page called "${name}" in ${setId}. Its pages are: ${keys.join(', ')}.`
      )
    }
  }
  return {
    keys: keys.filter((key) => resolved.includes(key)),
    problems
  }
}

const firstReaches = (scenarios) => {
  const reaches = new Map()
  for (const scenario of scenarios) {
    scenario.steps.forEach((step, index) => {
      if (!reaches.has(step.slug)) {
        reaches.set(step.slug, { scenario: scenario.name, index })
      }
    })
  }
  return reaches
}

const pagesAfterTheExamples = (pages, reaches, landingKey) => {
  const keys = pages.map(pageKey)
  const lastFilled = keys.reduce(
    (last, key, index) => (reaches.has(key) ? index : last),
    -1
  )
  if (lastFilled === -1) {
    return []
  }
  return keys
    .slice(lastFilled + 1)
    .filter((key) => key !== landingKey && !reaches.has(key))
}

const runsFor = (scenarios, reaches, wanted, primaryMustFinish) => {
  const runs = []
  scenarios.forEach((scenario, position) => {
    const captures = [...reaches.entries()]
      .filter(
        ([key, reach]) => reach.scenario === scenario.name && wanted.has(key)
      )
      .map(([key, reach]) => ({ key, index: reach.index }))
      .sort((a, b) => a.index - b.index)
    const finish = position === 0 && primaryMustFinish
    if (captures.length > 0 || finish) {
      runs.push({ scenario: scenario.name, captures, finish })
    }
  })
  return runs
}

/**
 * The walk plan for a set.
 *
 * @param {object} input - `{ pages, scenarios, wanted }`; `wanted` is a list
 * of page names from resolveWanted.
 * @returns {{ landing: object|null, runs: object[], hub: boolean,
 *   after: object[], unreached: string[], neverReached: string[] }}
 */
export const planWalk = ({ pages, scenarios, wanted }) => {
  const want = new Set(wanted)
  const landingKey = pages.length > 0 ? pageKey(pages[0]) : null
  const reaches = firstReaches(scenarios)
  const afterKeys =
    scenarios.length > 0
      ? pagesAfterTheExamples(pages, reaches, landingKey)
      : []
  const lastWantedAfter = afterKeys.reduce(
    (last, key, index) => (want.has(key) ? index : last),
    -1
  )
  const after = afterKeys
    .slice(0, lastWantedAfter + 1)
    .map((key) => ({ key, capture: want.has(key) }))
  const hub = scenarios.length > 0 && want.has(HUB_KEY)
  const runs = runsFor(scenarios, reaches, want, hub || after.length > 0)

  const reachable = new Set([
    ...(landingKey ? [landingKey] : []),
    ...reaches.keys(),
    ...afterKeys,
    ...(scenarios.length > 0 ? [HUB_KEY] : [])
  ])
  const flowKeys = pages.map(pageKey)
  return {
    landing: landingKey
      ? { key: landingKey, capture: want.has(landingKey) }
      : null,
    runs,
    hub,
    after,
    unreached: wanted.filter((key) => !reachable.has(key)),
    neverReached: flowKeys.filter((key) => !reachable.has(key))
  }
}
