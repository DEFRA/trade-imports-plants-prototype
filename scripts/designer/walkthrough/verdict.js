/**
 * What a walkthrough run came to, read from Playwright's JSON report.
 *
 * A walkthrough is documentation, so a story that stops part way (a red
 * story) is reported, never a failure. The run only fails when it crashed:
 * no report was written, Playwright itself reported an error (the prototype
 * did not start, a config or syntax error, the run hit its time limit), or no
 * walkthrough ran at all although there were sets to walk.
 *
 * Pure functions: the report is read by the caller and passed in.
 */

export const WALKTHROUGH_TAG_NAME = 'walkthrough'
const FEATURED_TAG_NAME = 'featured'
const NON_SET_TAGS = new Set([WALKTHROUGH_TAG_NAME, FEATURED_TAG_NAME])

const WALKED = new Set(['expected', 'flaky'])

// Playwright colours its messages for a terminal.
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g

/** The first line of a message, without terminal colours. */
export const firstLine = (message) =>
  String(message ?? '')
    .replace(ANSI, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line !== '') ?? ''

const crash = (reason) => ({ crashed: true, reason, sets: [] })

/**
 * Every spec in the report, each with the title of the suite it sits in.
 * Shared with `scripts/reports/demo/model.js`, so the stakeholder demo page
 * walks the same tree as the walkthrough's own verdict.
 */
export const specsOf = (suites, parentTitle = null) =>
  (suites ?? []).flatMap((suite) => [
    ...(suite.specs ?? []).map((spec) => ({
      ...spec,
      suiteTitle: suite.title ?? parentTitle
    })),
    ...specsOf(suite.suites, suite.title)
  ])

const isWalkthrough = (spec) => (spec.tags ?? []).includes(WALKTHROUGH_TAG_NAME)

// Every tag but 'walkthrough' and 'featured' is the set id.
const setIdOf = (spec) =>
  (spec.tags ?? []).find((tag) => !NON_SET_TAGS.has(tag)) ?? 'unknown'

/**
 * The last top-level step, and inside it the deepest one that failed. Shared
 * with `scripts/reports/demo/model.js`.
 */
export const failedStepTitle = (steps) => {
  const last = (steps ?? []).at(-1)
  if (!last?.error) {
    return null
  }
  const deeper = (last.steps ?? []).findLast((step) => step.error)
  return deeper ? deeper.title : last.title
}

/** A test's and its last result's annotations, deduplicated. Shared with
 * `scripts/reports/demo/model.js`. */
export const annotationsOf = (test, result) => {
  const seen = new Set()
  return [...(test.annotations ?? []), ...(result?.annotations ?? [])].filter(
    (annotation) => {
      const key = `${annotation.type}\u0000${annotation.description}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    }
  )
}

const storyOf = (spec) => {
  const test = spec.tests?.[0] ?? {}
  const result = (test.results ?? []).at(-1)
  const sentDirectly = annotationsOf(test, result)
    .filter((annotation) => annotation.type === 'Sent directly')
    .map((annotation) => annotation.description)
  if (test.status === 'skipped') {
    return { name: spec.title, status: 'skipped', sentDirectly }
  }
  if (WALKED.has(test.status)) {
    return { name: spec.title, status: 'walked', sentDirectly }
  }
  return {
    name: spec.title,
    status: 'stopped',
    timedOut: result?.status === 'timedOut',
    stoppedAt: failedStepTitle(result?.steps),
    said: firstLine(result?.errors?.[0]?.message ?? result?.error?.message),
    sentDirectly
  }
}

/**
 * The walkthrough sets and stories in a report, grouped by set in the order
 * they first appear.
 *
 * @param {object} report - Playwright's JSON report.
 * @returns {{ setId: string, title: string, stories: object[] }[]}
 */
export const walkthroughSets = (report) => {
  const sets = new Map()
  for (const spec of specsOf(report?.suites).filter(isWalkthrough)) {
    const setId = setIdOf(spec)
    if (!sets.has(setId)) {
      sets.set(setId, { setId, title: spec.suiteTitle ?? setId, stories: [] })
    }
    sets.get(setId).stories.push(storyOf(spec))
  }
  return [...sets.values()]
}

/**
 * The verdict on a walkthrough run.
 *
 * @param {object|null} report - Playwright's JSON report, or null when none
 *   was written.
 * @param {{ expectedSets?: string[] }} [options] - the sets the plan had.
 * @returns {{ crashed: boolean, reason: string|null, sets: object[] }}
 */
export const readVerdict = (report, { expectedSets = [] } = {}) => {
  if (!report) {
    return crash(
      'The walkthroughs did not run: Playwright wrote no report. Look at the output above for why.'
    )
  }
  const errors = report.errors ?? []
  if (errors.length > 0) {
    return crash(
      `The walkthroughs could not run: ${firstLine(errors[0].message)}`
    )
  }
  const sets = walkthroughSets(report)
  if (sets.length === 0 && expectedSets.length > 0) {
    return crash(
      `No walkthrough ran, although there were sets to walk (${expectedSets.join(', ')}).`
    )
  }
  return { crashed: false, reason: null, sets }
}

const walkedCount = (set) =>
  set.stories.filter((story) => story.status === 'walked').length

const counted = (set) =>
  set.stories.filter((story) => story.status !== 'skipped')

/** One plain sentence about a story that did not walk to its end. */
export const stoppedSentence = (story) => {
  if (story.timedOut) {
    return `'${story.name}' ran out of time before it finished. If the computer slept or was very busy during the run, run it again.`
  }
  const said = story.said ? `: ${story.said}` : ''
  return story.stoppedAt
    ? `'${story.name}' stopped at '${story.stoppedAt}'${said}`
    : `'${story.name}' walked to the end, but something went wrong${said}`
}

/** The red stories in a verdict, as `{ set, story }`. */
export const redStories = (verdict) =>
  verdict.sets.flatMap((set) =>
    set.stories
      .filter((story) => story.status === 'stopped')
      .map((story) => ({ set, story }))
  )

/**
 * The verdict in plain English, one line each.
 *
 * @param {object} verdict - from `readVerdict`.
 * @returns {string[]}
 */
export const summaryLines = (verdict) => {
  if (verdict.crashed) {
    return [verdict.reason]
  }
  if (verdict.sets.length === 0) {
    return ['There was nothing to walk through.']
  }
  return verdict.sets.flatMap((set) => {
    return [
      `${set.title}: ${walkedCount(set)} of ${counted(set).length} stories walked to the end.`,
      ...set.stories
        .filter((story) => story.status === 'stopped')
        .map((story) => `  ${stoppedSentence(story)}`),
      ...set.stories
        .filter((story) => story.sentDirectly.length > 0)
        .map(
          (story) =>
            `  '${story.name}' had ${story.sentDirectly.length} page(s) sent directly, because the screen would not move on. See its "Sent directly" notes in the report.`
        )
    ]
  })
}

/**
 * GitHub Actions warnings for the red stories: shown on the pull request's
 * checks, never failing them.
 */
export const githubWarnings = (verdict) =>
  redStories(verdict).map(
    ({ set, story }) =>
      `::warning title=Walkthrough: ${set.setId}::${stoppedSentence(story).replaceAll('\n', ' ')}`
  )

/** The walkthrough's exit code: 1 only when it crashed. */
export const exitCodeOf = (verdict) => (verdict.crashed ? 1 : 0)
