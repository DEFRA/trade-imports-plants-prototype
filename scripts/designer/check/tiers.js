/**
 * Which steps each tier runs, and which tier a change needs.
 *
 * quick: tidy, ownership, copy shape, templates, code rules (ESLint) on the
 *        changed code files, the prototype checks (and
 *        the real journey's own unit tests when the set is high-risk-plants).
 * full:  quick, then exactly what .husky/pre-commit runs
 *        (`npm run git:pre-commit-hook`): format:check, lint and npm test.
 *        A commit made straight after a green full check passes the hook.
 * walk:  full, then `npm run test:fit:journeys` in a real browser.
 */

export const REAL_JOURNEY_SET = 'high-risk-plants'

export const STEP_TITLES = Object.freeze({
  tidy: 'Tidy the code layout (Prettier)',
  ownership: 'Whose files you changed',
  copy: 'English and Welsh words',
  templates: 'Page templates',
  'code-rules': 'Code rules in the files you changed',
  'prototype-checks': 'Pages open (prototype checks)',
  'real-journey-tests': 'Real journey unit tests',
  'format-check': 'Code layout of every file (pre-commit hook)',
  lint: 'Code rules (pre-commit hook)',
  'unit-tests': 'All unit tests (pre-commit hook)',
  walk: 'Walk every journey in a browser'
})

const QUICK = [
  'tidy',
  'ownership',
  'copy',
  'templates',
  'code-rules',
  'prototype-checks',
  'real-journey-tests'
]
const FULL = [...QUICK, 'format-check', 'lint', 'unit-tests']
const WALK = [...FULL, 'walk']

const BY_TIER = { quick: QUICK, full: FULL, walk: WALK }

/** Steps that only run once every step before them has passed. */
export const SLOW_STEPS = new Set([
  'format-check',
  'lint',
  'unit-tests',
  'walk'
])

/** The step ids a tier runs for one set, in order. */
export const stepsFor = (tier, setId) =>
  (BY_TIER[tier] ?? QUICK).filter(
    (step) => step !== 'real-journey-tests' || setId === REAL_JOURNEY_SET
  )

const COPY_FILE = /\/copy\/copy\.(en|cy)\.js$/
const WORDS_OR_LOOKS = /\.(njk|md)$/

const isWordsOrLooks = (repoPath) =>
  COPY_FILE.test(repoPath) || WORDS_OR_LOOKS.test(repoPath)

/**
 * The tier a set of changed paths needs: quick when only copy files,
 * templates or docs changed; full when anything else did (flow, controllers,
 * the model, fixtures, scripts), because only the full suite proves those.
 */
export const suggestTier = (changedPaths) => {
  const other = changedPaths.filter((repoPath) => !isWordsOrLooks(repoPath))
  if (other.length === 0) {
    return {
      tier: 'quick',
      reason: 'You changed only words, templates or notes.'
    }
  }
  return {
    tier: 'full',
    reason: `You changed how pages work (for example ${other[0]}). Run the full check before you share it.`
  }
}
