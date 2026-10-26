# Architecture: layers and composition

The application separates reusable platform machinery from obligation-set data and
journey presentation. Dependency Cruiser enforces the boundaries in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

## L1: composition and registry

The files directly under `src/server/app/` compose the application.
[`src/server/app/routes.js`](../routes.js) is only the export barrel; the per-set
gateways it re-exports — today
[`routes-high-risk-plants.js`](../routes-high-risk-plants.js) — are the only
production modules outside a set that import `sets/**`.
[`src/server/router.js`](../../router.js) mounts each gateway under its own
prefix and redirects `/` to the default set.

At boot, `routes-high-risk-plants.js` registers its mount and, inside its own
set context:

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
- set imports outside `routes.js` and the per-set `routes-<set-id>.js` gateways
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
the set's gateway, `routes-high-risk-plants.js`. Unconfigured, that seam is
fail-closed.

Tests may compose real layers, but production code cannot use test exemptions.

## Set context

A request finds its set from its path: the longest mount prefix wins, whatever
the registration order. `setContextExtension` enters that set on `onRequest`,
before routing, so the shared error page on an unrouted path and the view
marshal step, which runs after the handler returns, both resolve the right set.
`routeWithSetContext()` runs every method a set's route declares — `handler`,
`options.handler`, `options.pre` and `ext` entries — inside that set.

A seam made with `setKeyed(label, { configuredBy })` is required: a set that
mounts without calling `configuredBy` is rejected. A seam with a default
registers nothing.

`kit.base()` resolves the layout and caption through the active set, so a page
outside every set uses `kit.serverWideBase()`, and the error page uses
`kit.chromeFor()` to choose between them from the request path. The chrome's
home link is the set's own dashboard, or `/` for a page outside every set. The
global view context in
[`config/nunjucks/context/context.js`](../../../config/nunjucks/context/context.js)
gives every rendered view the same `homeUrl` and active navigation item, worked
out from the request path, and a view's own context wins.

## Feature folders

A feature's production controllers do not share controller logic with another
feature's controllers. The rule covers production controllers only, never test
support. Importing a sibling feature's helper — a page identity, a view-model
function or a test helper — is fine.

## Shared controller support: `shared/kit.js`

[`shared/kit.js`](../shared/kit.js) holds what every journey page does the same
way:

- page chrome: `base()`, `serverWideBase()`, `chromeFor()`, `journeyStrip()`,
  `SURFACES` and `surfaceClass()`
- errors: `errorSummary()`, `fieldError()` and `logRefusal()`
- where a POST goes next: `hubExitTarget()`, `isHubExit()`, `exitTarget()`,
  `runTarget()` and `nextTarget()`
- where a page's Back link goes: `runBackLink()`
- saving: `recoverableSave()` and `pageRoutes()`
- date fields: `readDate()` and `dateField()`

A helper belongs in `kit.js` only when every journey page could use it and it
names no feature, set or page. Validation rules go in
[`lib/validate/`](../lib/validate/index.js), copy in the feature's `copy/`
folder, and backend calls in `services/`.

## How this repo does common things

### Concurrency token

Every journey page carries the journey's `concurrencyToken`: `kit.base()` puts
it on the view and the template posts it back in a hidden field. A save whose
token is stale throws `STALE_CONCURRENCY_TOKEN`. `kit.pageRoutes()` turns that
into a redirect to the same page with `?staleAction=1`, and logs it.

### POST redirects

A POST that saves redirects (post, redirect, get): to `kit.nextTarget()` on
success, or to the page a refusal names. A POST that fails validation
re-renders the page with status 400 and does not redirect. The address-book
pickers (place of destination, consignor, consignment contact) render from a
POST on purpose: Search posts the form with `action=search` and the page
re-renders with the results, keeping the trader's choice.

### Page title

A controller passes the page's own title to `kit.base()`.
[`shared/layout.njk`](../shared/layout.njk) builds the `<title>` from it: the
error prefix when the page shows an error summary, then the page title, the
service name and GOV.UK. A page never builds its own `<title>`.

A link destination that is the same in every language, such as the phase
banner's feedback address, is set in `shared/layout.njk`, not in copy.

### Backend HTTP clients

Each backend or reference-data call lives in its own module under `services/`,
for example [`services/ports/client.js`](../services/ports/client.js) and
[`services/persistence/records/real/http/`](../services/persistence/records/real/http/put.js).
A controller calls the service, never `fetch`. Call counting and metrics
helpers wrap a client; they do not hold one.

## Logging

A branch that changes what a request does — a refusal, a redirect away from the
normal next page, a retry or a fallback — logs once through `request.logger`,
so the line carries the request's trace id. Log the ids support searches by:
`journeyId` always, plus the reason and any token or code the decision turned
on. Log a caught error as `{ err }`, never only its message.

A user's own field errors, shown back on the form, are not logged. Every other
refusal that shows the page again, such as a state refusal, a bare 400 or
another service refusing what this one accepted, calls
`kit.logRefusal(request, { fieldErrors, ...details })` once, before it renders,
whatever status code it answers with. `fieldErrors` is the map of field key to
the message the page shows (empty when it shows none). The line is info, carries
`journeyId`, the route and the error codes (the field keys, never the
messages), and takes any named reason or ids the branch decided on as further
keys of the options.

`kit.recoverableSave()` takes the request and logs every save fallback once at
warn, with `journeyId` and the caught error as `err`, plus any ids the page
passes it. `recoverableSave` writes that line; a page's fallback callback only
builds the response.

A refusal answered by a redirect logs its own named line with the journey id
and the reason.

The canonical example is the declaration refusal in
[`declaration/controller.js`](../sets/high-risk-plants/journeys/linear/features/declaration/controller.js):

```js
request.logger.info(
  {
    journeyId: journey.journeyId,
    refusal,
    concurrencyToken: journey.concurrencyToken
  },
  'Declaration refused'
)
```

`refusal` is one of the `DECLARATION_REFUSAL` values, so support can search for
each reason by name.

Nothing logs a request or response body at INFO. A response of 500 or above is
logged once, by `catchAll` in
[`common/helpers/errors.js`](../../common/helpers/errors.js), with the error,
its status and the `journeyId`.
