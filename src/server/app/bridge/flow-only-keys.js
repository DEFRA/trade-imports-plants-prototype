// The flow-only-key seam, kept in bridge so `bridge/obligation-source.js` and
// `bridge/scope.js` consume it as a sibling. L1 hands the journey's list to
// `configureJourneyFlow`, which forwards it here; the default is `[]`, so an
// unconfigured platform recognises and projects no flow-only key.
// This module imports nothing, so no importer forms a cycle — the graph stays
// a DAG and bridge never reaches up into flow.

let configuredKeys = []

export const configureFlowOnlyKeys = (keys) => {
  configuredKeys = keys
}

export const flowOnlyKeys = () => configuredKeys
