# high-risk-plants set and linear journey

The high-risk-plants obligation set and its linear notification journey. The
set owns plant obligations, collecting pages, task rows and flow sections;
the engine and bridge under `src/server/app/` remain generic.

Read the generic documentation in [`../../../docs/`](../../../docs/README.md)
for how the engine works. The guides and recipes below describe the set's
conventions and link to implemented features.

## Run and test

Run commands from the repository root.

```bash
npm run dev
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run test:fit:journeys
```

`npm run test:high-risk-plants` runs only tests under
`src/server/app/sets/high-risk-plants`. Use `npm test` for L1 composition,
bridge, convention and full-suite coverage.

The Playwright default port is 3003, the same port the workspace stack serves
this frontend on. Pass `PORT=3053` when the stack is up so the two do not
collide; `npm run test:fit:ci` does this for you.

## Set and journey guides

- [Obligation set](obligation-model.md)
- [Feature anatomy](features.md)
- [Journey flow and gates](journey-flow-and-gates.md)
- [Set-owned services](services.md)
- [High-risk-plants limits](limits.md)
- [Testing the set and journey](testing.md)
- [Lighthouse](lighthouse.md)

## Recipes

- [Add a field](add-a-field.md)
- [Add a page](add-a-page.md)
- [Add a feature group, flow section and task row](add-a-section.md)
- [Add a repeatable collection](add-a-collection.md)

## Platform guides used by this set

- [Architecture](../../../docs/architecture.md)
- [Engine](../../../docs/engine.md)
- [Flow machinery](../../../docs/flow-and-gates.md)
- [Scope and wipe](../../../docs/scope-and-wipe.md)
- [Validation](../../../docs/validation.md)
- [Persistence](../../../docs/persistence.md)
- [Collection cardinality](../../../docs/cardinality.md)
- [Testing the platform](../../../docs/testing.md)

## What the set exports, and what consumes it

| File                                             | Exports                                           | Consumed by                                                 |
| ------------------------------------------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| `obligations/index.js`                           | `obligations`, `groups`                           | `configureObligationSet`                                    |
| `journeys/linear/config.js`                      | `TEMPLATES`, `LAYOUT`, `SESSION_COOKIE_NAMES`     | `configureJourneyFlow`, `configureSession`, set controllers |
| `journeys/linear/features/index.js`              | `dispatchPages`, `allRoutes`                      | `buildDispatch`, `server.route`                             |
| `journeys/linear/features/evaluation.js`         | `featureEvaluationBindings`                       | `configureFulfilmentRegistry`                               |
| `journeys/linear/flow/flow.js`                   | `FLOW_ONLY_KEYS`, `sections`                      | `configureJourneyFlow`                                      |
| `journeys/linear/flow/task-rows.js`              | `taskRows`, `rowStatus`                           | `configureJourneyFlow`                                      |
| `journeys/linear/flow/section-captions/index.js` | `captionSections`, `sectionCaptionOf`             | `configureJourneyFlow`                                      |
| `journeys/linear/flow/run.js`                    | `nextRunTarget`                                   | `configureJourneyFlow`                                      |
| `journeys/linear/flow/entry-guard.js`            | `entryGuardTarget`                                | `server.ext('onPreHandler')`                                |
| `journeys/linear/parties/index.js`               | `REFERENCE_PARTIES`, `withoutUnresolvedPartyRefs` | `configureAnswersForRead`                                   |

[`src/server/app/routes.js`](../../../routes.js) is the composition seam that
wires all ten. The unit suite installs a synthetic journey-neutral fixture
from `test/fixtures/` instead — the engine must not depend on the set.

## The served surface today

The service serves a notification dashboard at `/`, alongside `/health`,
authentication, sign-out and static assets. The dashboard lists, searches,
sorts and paginates notifications, and starts a notification through
`POST /notifications`.

Each notification has a task-list hub at `/notifications/{journeyId}`. Its
seven task rows cover commodities, origin, arrival, destination, consignor,
identification numbers and consignment contact. The destination, consignor
and consignment contact pages are all the same address-book picker — a search
box over the organisation's book, five rows a page with a radio per row, and
paging links — sharing its shell through
`journeys/linear/features/address-book-picker/`; the contact page differs in
storing a copy of the record it picks and in allowing a blank save. The
commodities feature has a list page and an entry sub-page for adding or
editing a line. Scope controls
which questions apply: for example, potato notifications skip arrival status
and go straight to arrival details.

The review section contains check answers, declaration and confirmation;
readiness gates entry to it. Registered actions also support amending,
cancelling an amendment, copying and deleting notifications. The entry guard
redirects a notification with neither a started opening run nor committed user
answers to `commodity-type`, including when its hub is requested directly.

[`features/index.js`](../journeys/linear/features/index.js) registers the
surface; [`flow/flow.js`](../journeys/linear/flow/flow.js) and
[`flow/task-rows.js`](../journeys/linear/flow/task-rows.js) define page order and
hub tasks. This is the detailed served-surface reference linked by the repo
and platform READMEs.

## Adding the first obligation is a three-part change

Three boot guards enforce a joint invariant, so an obligation, the page
that collects it and the binding that owns it must land together:

1. `buildDispatch` → `assertFullCoverage` throws
   `Obligations collected by no page` for any obligation that no page
   names in `collects` and that is not in the generic
   `SYSTEM_POPULATED` set.
2. `assertFulfilmentBindingCoverage` → `createFulfilmentRegistry` throws
   `obligations owned by no feature` for any leaf obligation (one that
   nothing declares itself `within`) that no feature binding claims.
3. The registry also requires the binding to import the **same object
   instance** the manifest exports — a structurally identical copy fails
   with `must import its obligation object from the manifest`.

Build bindings with `feature`, `scalar` and `grouped` from
[`../../../bridge/fulfilment-bindings.js`](../../../bridge/fulfilment-bindings.js).

## Gates on the first journey-page increment

**The entry guard is restored — gate closed.**
`flow/entry-guard.js` is live, against this journey's entry page
`commodity-type`. Its `guardedJourneyPath` filter skips anything outside
`/notifications/<id>/`, the create path, the
`amend`/`cancel-amend`/`copy`/`delete` action slugs, and the entry page
and its sub-paths. Every other journey path — the hub included — is
admitted only by one of two let-throughs: `openingRunStarted` for that
journey in this session, or `hasCommittedNotificationAnswers`. Anything
else is redirected to `commodity-type`, so a journey URL alone no longer
reaches a mid-journey page or bypasses the opening run. See
[Journey flow and gates](journey-flow-and-gates.md).

**`configureAnswersForRead` is wired — gate closed.**
`parties/index.js` holds the set's sanitiser, and `routes.js` passes
`withoutUnresolvedPartyRefs` to `configureAnswersForRead`. Every answer
in `REFERENCE_PARTIES` holds an address-book `{ addressId }` and nothing
more, so an id the book no longer resolves — a record deleted, or one
that never existed — drops out of the answers on every read and the
notification treats it as never entered. Each new party that is held as
a reference joins that list; one held as a copy of the address does not,
because a copy cannot dangle.

**`sectionCaption` is wired — gate closed.**
`flow/section-captions/index.js` holds the caption map with its
`copy.en.js`/`copy.cy.js` pair, and `sectionCaption` is passed in the
`configureJourneyFlow` call in both `routes.js` and
`test/fixtures/index.js` (the fixture with a synthetic map of its own).
The dashboard is the only captioned section so far; each page increment
files its own page there or lists it as bare.

**`FLOW_ONLY_KEYS` is empty.** Add `declaration` with the declaration
page, not before — a flow-only key widens the recognised answer-key
surface for a key nothing can yet write.

## Recipe exemplars

Start with the recipe, then read its linked feature files. These are the
implemented plants examples for each available shape:

| Recipe                                  | Shape                                                                                 | Plants exemplar                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Add a page](add-a-page.md)             | Smallest complete single-field collecting page                                        | [commodity-type](../journeys/linear/features/commodity-type/page.js)                                                                                                     |
| [Add a field](add-a-field.md)           | Several fields, conditional scope and service-backed options                          | [arrival-details](../journeys/linear/features/arrival-details/controller.js)                                                                                             |
| [Add a section](add-a-section.md)       | Multi-page feature group with one hub task row                                        | [commodities](../journeys/linear/features/commodities/page.js), with the `commodities` [task row](../journeys/linear/flow/task-rows.js)                                  |
| [Add a collection](add-a-collection.md) | List page plus entry sub-page, per-instance conditional fields and a collection floor | [commodities list](../journeys/linear/features/commodities/list/list.controller.js) and [details](../journeys/linear/features/commodities/details/details.controller.js) |

The single-page loop, batch split and nested collection shapes have no plants
implementation. The [collection recipe](add-a-collection.md) describes those
patterns; they are not additional served features or local exemplars.

## Engine sync

Synced the journey-agnostic engine and platform from animals range
`2ed89aef..dc669de448ec71ea2e3a91b9501f582639226c3e` (remote `main`,
measured 2026-09-10), excluding `src/server/app/sets/`. The next sync starts
at `dc669de448ec71ea2e3a91b9501f582639226c3e`.

The port retains the synthetic fixture manifest, plants composition and
backend contract, and plants date/time and dashboard extensions. Animals
journey content and its document, commodity-reference and mapper-a services
remain excluded. Gate metadata now uses `gateType`, `obligationId` and
`gatedParentGroupId`; implications expose `fulfilmentIndexes` with status on
the implication. The count invariant is `fulfilmentIndexCountEquals`.
