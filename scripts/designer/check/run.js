/**
 * Runs one tier of designer:check for one set: every step in order, the slow
 * pre-commit steps only once everything before them has passed, then a plain
 * translation of every failure.
 */
import { STEP_RUNNERS } from './steps.js'
import { SLOW_STEPS, STEP_TITLES, stepsFor, suggestTier } from './tiers.js'
import { translate } from './translate.js'

const NOT_RUN = 'Not run: fix the problems above first.'

/**
 * @param {object} options
 * @param {string} options.setId - the set to check.
 * @param {'quick'|'full'|'walk'} options.tier - how much to check.
 * @param {string} options.root - the repo root.
 * @param {string[]} options.changedPaths - what git status lists.
 * @param {Function} options.runCommand - see process.js.
 * @param {object} [options.runners] - the step runners (tests replace them).
 * @param {(id: string, title: string) => void} [options.onStep] - called as
 * each step starts.
 * @param {(title: string, output: string) => void} [options.onOutput] -
 * called with each step's raw output, for the log.
 * @returns {Promise<object>} `{ setId, tier, ok, steps, findings, suggestion }`
 */
export const runCheck = async ({
  setId,
  tier,
  root,
  changedPaths,
  runCommand,
  runners = STEP_RUNNERS,
  onStep = () => {},
  onOutput = () => {}
}) => {
  const steps = []
  let failedSoFar = false

  for (const id of stepsFor(tier, setId)) {
    const title = STEP_TITLES[id]
    if (failedSoFar && SLOW_STEPS.has(id)) {
      steps.push({ id, title, status: 'skipped', summary: NOT_RUN })
      continue
    }
    onStep(id, title)
    const outcome = await runners[id]({ setId, root, changedPaths, runCommand })
    onOutput(title, outcome.output ?? '')
    steps.push({ id, title, details: [], ...outcome })
    failedSoFar = failedSoFar || outcome.status === 'fail'
  }

  const findings = steps
    .filter((step) => step.status === 'fail')
    .flatMap((step) =>
      translate(step.output, { changedPaths }).map((finding) => ({
        ...finding,
        step: step.title
      }))
    )

  return {
    setId,
    tier,
    ok: steps.every((step) => step.status !== 'fail'),
    steps: steps.map(({ output, ...step }) => step),
    findings,
    suggestion: suggestTier(changedPaths)
  }
}
