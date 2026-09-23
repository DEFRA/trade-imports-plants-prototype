import { currentSetId, setKeyed } from '../shared/set-context.js'

// The `readyForCheckYourAnswers` seam, kept in bridge so `bridge/scope.js`
// consumes it as a sibling. L1 injects the real roll-up at boot — each set's
// gateway passes `flow/section-status.js`'s `readyForCheckYourAnswers`, which
// rolls the task rows up through `rowStatus` / `statusOf`; tests override it
// the same way, via `configureReadyForCheckYourAnswers`, which
// `engine/read.js` re-exports. The default is fail-closed, which is the right
// answer for a seam read before boot finishes — but a set that never injects
// the roll-up would hold its own submit gate permanently shut, with no boot
// error and no request error, so the seam is REQUIRED: a gateway that forgets
// it is refused at mount by `set-completeness.js`.
// A separate module so neither importer forms a cycle — the graph stays a DAG.

const FAIL_CLOSED = () => false

const store = setKeyed('Ready-for-check-your-answers', {
  configuredBy: 'configureReadyForCheckYourAnswers'
})

export const configureReadyForCheckYourAnswers = (setId, compute) => {
  store.configure(setId, compute)
}

// Unreachable from a mounted set — the completeness gate refuses that set —
// but kept so a read before boot finishes keeps the gate shut rather than
// throwing.
const readyForCheckYourAnswersFn = () =>
  store.has(currentSetId()) ? store.current() : FAIL_CLOSED

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn()(answers, inScope, evaluation)
