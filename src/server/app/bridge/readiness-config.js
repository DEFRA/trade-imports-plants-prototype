// The `readyForCheckYourAnswers` seam, kept in bridge so `bridge/scope.js`
// consumes it as a sibling. L1 injects the real roll-up at boot —
// `routes.js` passes `flow/section-status.js`'s `readyForCheckYourAnswers`,
// which rolls the task rows up through `rowStatus` / `statusOf`; tests override
// it the same way, via `configureReadyForCheckYourAnswers`, which
// `engine/read.js` re-exports. The default is fail-closed, so a forgotten
// injection holds the submit gate shut rather than opening it silently.
// A separate module so neither importer forms a cycle — the graph stays a DAG.

let readyForCheckYourAnswersFn = () => false

export const configureReadyForCheckYourAnswers = (compute) => {
  readyForCheckYourAnswersFn = compute
}

export const computeReadyForCheckYourAnswers = (answers, inScope, evaluation) =>
  readyForCheckYourAnswersFn(answers, inScope, evaluation)
