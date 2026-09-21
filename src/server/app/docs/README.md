# Application platform documentation

`src/server/app/` is the shared notification-journey platform. It evaluates an
obligation set, manages canonical state, runs journey flow machinery and connects
abstract persistence ports to service implementations.

The application has four layers:

1. L1 — `src/server/app/`: composition and registration
2. L2 — the existing `engine`, `model`, `bridge`, `flow`, `services`, `lib`,
   `shared` and `analysis` directories under `src/server/app/`: set-agnostic
   platform code
3. L3 — `sets/<set>/obligations/`: one set's obligation data
4. L4 — `sets/<set>/journeys/<style>/`: one journey's pages and topology

[`src/server/app/routes.js`](../routes.js) is the composition point. It selects
the high-risk-plants set and linear journey, then supplies them to the platform through
the `configure*` seams.

The platform below is complete. The high-risk-plants set above it is empty, so
everything these guides describe is live code that currently runs over nothing;
the set guide's
[The served surface today](../sets/high-risk-plants/docs/README.md#the-served-surface-today)
describes what that leaves the service serving. Read the
[set guide](../sets/high-risk-plants/docs/README.md) before adding the first
obligation — three boot guards make the obligation, its page and its binding a
single indivisible change.

## Platform guides

- [Architecture](architecture.md)
- [Architecture decisions](decisions.md)
- [Engine](engine.md)
- [Obligation model](obligation-model.md)
- [Flow machinery and gates](flow-and-gates.md)
- [Scope and wipe](scope-and-wipe.md)
- [Collection cardinality](cardinality.md)
- [Validation](validation.md)
- [Persistence](persistence.md)
- [Services](services.md)
- [Analysis and reachability](analysis.md)
- [Platform limits](limits.md)
- [Testing the platform](testing.md)
- [Cross-repository test ownership](test-ownership.md)

## Set guides

- [High-risk-plants set and linear journey](../sets/high-risk-plants/docs/README.md)
- [Obligation set](../sets/high-risk-plants/docs/obligation-model.md)
- [Feature anatomy](../sets/high-risk-plants/docs/features.md)
- [Journey flow and gates](../sets/high-risk-plants/docs/journey-flow-and-gates.md)
- [Set-owned services](../sets/high-risk-plants/docs/services.md)
- [High-risk-plants limits](../sets/high-risk-plants/docs/limits.md)
- [Testing the set and journey](../sets/high-risk-plants/docs/testing.md)
- [Lighthouse](../sets/high-risk-plants/docs/lighthouse.md)

## Recipes

- [Add a field](../sets/high-risk-plants/docs/add-a-field.md)
- [Add a page](../sets/high-risk-plants/docs/add-a-page.md)
- [Add a feature group, flow section and task row](../sets/high-risk-plants/docs/add-a-section.md)
- [Add a repeatable collection](../sets/high-risk-plants/docs/add-a-collection.md)
