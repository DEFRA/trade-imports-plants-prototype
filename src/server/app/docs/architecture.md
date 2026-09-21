# Architecture: layers and composition

The application separates reusable platform machinery from obligation-set data and
journey presentation. Dependency Cruiser enforces the boundaries in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

## L1: composition and registry

The files directly under `src/server/app/` compose the application.
[`src/server/app/routes.js`](../routes.js) is the only production module outside a
set that imports `sets/**`.

At boot, `routes.js`:

- gives the high-risk-plants manifest to
  [`configureObligationSet()`](../model/obligations/manifest.js)
- gives feature bindings to
  [`configureFulfilmentRegistry()`](../bridge/fulfilment-registry.js)
- gives journey sections, task rows, navigation and layout policy to
  [`configureJourneyFlow()`](../flow/journey-flow.js), which forwards the
  journey's flow-only keys into
  [`bridge/flow-only-keys.js`](../bridge/flow-only-keys.js)
- injects the check-your-answers readiness roll-up from
  [`flow/section-status.js`](../flow/section-status.js) through
  [`configureReadyForCheckYourAnswers()`](../bridge/readiness-config.js)
- builds the obligation-to-page dispatch index with
  [`buildDispatch()`](../flow/dispatch.js)
- injects records and session adapters through
  [`configureRecords()`](../engine/persistence/records.js) and
  [`configureSession()`](../engine/persistence/session.js)
- registers the journey cookies, entry guard and Hapi routes

The purity and binding-coverage assertions run after those registrations and before
routes are added to the server.

## L2: set-agnostic platform

The reusable code lives in these directories:

- `model/` — pure obligation evaluation, state queries and helper metadata
- `bridge/` — the translation between obligations and page-shaped fulfilments
- `engine/` — stateful reads, writes and abstract persistence ports
- `flow/` — dispatch, gates, prerequisites, navigation and injected journey policy
- `services/` — IO adapters and reference-data services
- `lib/` — small generic helpers, including validation
- `shared/` — common controller and template support
- `analysis/` — journey simulation and reachability tooling

Production L2 code does not import a set. Set and journey data arrive through L1
configuration.

## L3: obligation sets

Each set owns its manifest and section declarations under
`sets/<set>/obligations/`. An obligation set may use L2 model helpers,
but it does not import a journey.

The high-risk-plants manifest is
[`src/server/app/sets/high-risk-plants/obligations/index.js`](../sets/high-risk-plants/obligations/index.js).
The generic manifest accessors remain in
[`src/server/app/model/obligations/manifest.js`](../model/obligations/manifest.js).

## L4: journeys

A journey owns page identity, controllers, templates, copy, bindings, section order,
task rows and opening-run policy. Journeys may use their own set and L2 APIs. They do
not import another journey or another set.

The high-risk-plants linear journey uses two Nunjucks roots configured in
[`src/config/nunjucks/nunjucks.js`](../../../config/nunjucks/nunjucks.js):

- `src/server/app` resolves shared views such as `shared/layout.njk`
- `src/server/app/sets` resolves journey views

Its configuration is
[`src/server/app/sets/high-risk-plants/journeys/linear/config.js`](../sets/high-risk-plants/journeys/linear/config.js):

```js
export const TEMPLATES = 'high-risk-plants/journeys/linear'
export const LAYOUT = 'shared/layout.njk'
```

## Enforced boundaries

Dependency Cruiser scans all of `src/server/app`. Its error-level rules prevent:

- L2 production imports from `sets/**`
- set imports outside `routes.js`
- obligations importing journeys
- one journey importing a sibling journey
- one set importing another set
- engine imports from services or higher runtime layers
- model, bridge and flow imports that cross their allowed boundaries
- circular dependencies

No violation is baselined. `.dependency-cruiser-known-violations.json` is empty,
so `npm run lint:arch` is green on the rules themselves. The bridge reaches
nothing in `flow`: the journey's flow-only keys are held in
[`bridge/flow-only-keys.js`](../bridge/flow-only-keys.js) and forwarded there by
`configureJourneyFlow`, and the check-your-answers readiness roll-up reaches
[`bridge/readiness-config.js`](../bridge/readiness-config.js) by injection from
`routes.js`. Unconfigured, that seam is fail-closed.

Tests may compose real layers, but production code cannot use test exemptions.
