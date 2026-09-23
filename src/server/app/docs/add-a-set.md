# How to add a set

A **set** is one whole obligation set: an L3 manifest, an L4 journey, an L1
gateway and its own mount prefix. This is the recipe for adding one alongside
the sets already running.

Use it only when you are adding a whole set. To work inside a set that already
boots, use that set's own recipes under `sets/<set-id>/docs/` instead.

This is a platform-level procedure. It changes L1 composition, the URL
namespace, the dependency rules, the test matrix and — because the URLs move —
the `trade-imports-animals-tests` repository. No step here is optional.

Paths are relative to `src/server/app/` unless stated otherwise. `<set-id>` is
the kebab-case id you choose in step 1.

## Read these first

`high-risk-plants` is the worked example of a full set. `sample-journey`
([`../routes-sample-journey.js`](../routes-sample-journey.js),
[`../sets/sample-journey/`](../sets/sample-journey/)) is the worked example of
ADDING one: it is the smallest set this recipe produces, and it is the second
real set this repo ships. Read them in this order:

- [`../routes-high-risk-plants.js`](../routes-high-risk-plants.js) — the gateway body
  step 4 reproduces for your set. [`../routes.js`](../routes.js) is only the
  export barrel.
- [`../../router.js`](../../router.js) — where gateways are mounted and where
  the server-wide routes live.
- [`../sets/high-risk-plants/set.js`](../sets/high-risk-plants/set.js) — the set's
  identity, kept apart from its gateway.
- [`../shared/set-context.js`](../shared/set-context.js) — how a request
  resolves its set.
- [`../shared/paths.js`](../shared/paths.js) — route-shape builders against
  link builders. The mount depends on that distinction.
- [`architecture.md`](architecture.md) — the L1–L4 layering Dependency Cruiser
  enforces.

## The co-residency contract

Every gateway registers into one Node process. All sets are live at the same
time, in the same server, for the same browser. Nothing selects a set at boot.

Four rules hold that together. Breaking any of them is silent while one set is
mounted and only surfaces when a second arrives, which is why each is pinned by
[`../no-set-singletons.test.js`](../no-set-singletons.test.js) and
[`../co-residency.test.js`](../co-residency.test.js).

**1. Every `configure*` seam takes the set id first.** Each stores its value
per set behind `setKeyed`, and each read accessor resolves through
`currentSetId()`. A seam that kept one module-level variable would let the
second registration overwrite the first. The eight seams a gateway calls are
`configureObligationSet`, `configureFulfilmentRegistry`,
`configureAnswersForRead`, `configureReadyForCheckYourAnswers`,
`configureJourneyFlow`, `buildDispatch`, `configureRecords` and
`configureSession`.

`configureFlowOnlyKeys` is set-keyed too, but no gateway calls it:
`configureJourneyFlow` calls it from the journey's own `flowOnlyKeys` field
([`../flow/journey-flow.js`](../flow/journey-flow.js) lines 25-28).

**2. A request resolves its set from the owning plugin realm, never from the
URL.** Each gateway installs an `onPreAuth` extension that calls
`enterSetContext(setId)`, so Hapi's own routing decides the set. Do not parse
the path to work out which set you are in.

**3. Every set-owned lifecycle extension passes `{ sandbox: 'plugin' }`.**
Plugin ownership alone does **not** scope an extension. An extension registered
without that option is server-wide and runs on every other set's routes, and
the last registration wins. This applies to the `onPreAuth` context entry and
to the `onPreHandler` entry guard alike.

**4. Async boundaries are wrapped.** Authentication and payload processing
cross asynchronous boundaries after `onPreAuth`. Run the gateway's registration
inside `withSetContext(setId, …)` and pass every route through
`routeWithSetContext(setId, route)`, which wraps the handler and any
route-owned lifecycle extension. Server-wide routes stay outside every set
context.

The server-level `server.ext('onPreHandler', …)` entry guard must wrap its own
body in `withSetContext(SET_ID, …)` as well. Neither wrapper above covers it:
`routeWithSetContext` reaches route-owned lifecycle extensions only, and the
registration-time wrapper has long since returned by the time a request runs.
Copy the shape from [`../routes-high-risk-plants.js`](../routes-high-risk-plants.js)
lines 88-101. Without the wrap the guard resolves only by the sole-set fallback
and throws the moment a second set mounts.

## The mount prefix is not a choice

**It is `'/' + setId`.** Every set mounts under its own prefix, and no set is
registered at the root. `registerSetMount` throws on an empty prefix.

Two reasons, and they are the whole argument:

- The set id is already the key for every other per-set fact — `setKeyed`, the
  plugin name, the cookie names, the `sets/<set-id>/` directory, the Nunjucks
  `TEMPLATES` root. Deriving the mount from the same id means one fact per set
  and no mount table to drift out of step with the routes.
- With every set prefixed, a doubled prefix and a dropped prefix both fail
  visibly on the first request. If one set sat at the root, both bugs would
  produce the same correct-looking string for that set and stay hidden until
  somebody opened another set.

Two consequences follow:

- **`/` belongs to no set.** In this repo it is the chooser — a server-wide
  page listing every mounted set, registered by
  [`../../sets-index/index.js`](../../sets-index/index.js) outside every
  gateway. This is the prototype host: with several prototypes running there is
  no default to redirect to, and a reader arriving at the service needs to see
  what is on offer. A set appears on it purely by mounting; there is no list to
  keep in step. (The two frontends redirect instead, because each has one
  default set.)
- **A server-wide page has no set, so it cannot use `kit.base()`**, which reads
  the set-keyed journey flow. Use `kit.serverWideBase()`, or `kit.chromeFor()`
  on a page reached from both — the error page. With a single set mounted the
  sole-set fallback hides the difference; with two, `base()` throws.
- **`/health`, `/signout`, the `/auth/*` routes and the static-asset route are
  server-wide.** They must never sit inside a prefixed `server.register` call.
  `/signout` is the live trap: it registers perfectly happily at
  `/<set-id>/signout` and nothing fails until a user tries to sign out.

The resulting mount table with the two shipped sets and yours in the tree:

| Set                | Dashboard           | Create                            | Hub                                           | Page                                                 |
| ------------------ | ------------------- | --------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `high-risk-plants` | `/high-risk-plants` | `/high-risk-plants/notifications` | `/high-risk-plants/notifications/{journeyId}` | `/high-risk-plants/notifications/{journeyId}/{slug}` |
| `sample-journey`   | `/sample-journey`   | `/sample-journey/notifications`   | `/sample-journey/notifications/{journeyId}`   | `/sample-journey/notifications/{journeyId}/{slug}`   |
| `<set-id>`         | `/<set-id>`         | `/<set-id>/notifications`         | `/<set-id>/notifications/{journeyId}`         | `/<set-id>/notifications/{journeyId}/{slug}`         |

`sample-journey` serves only its dashboard today — it is a placeholder set with
one page — but its mount follows the same shape.

## Route builders against link builders

[`../shared/paths.js`](../shared/paths.js) exports two families, and using one
where the other belongs is the defect this split exists to prevent.

| Family       | Members                                                                  | Carries the prefix?                     | Evaluated                                                |
| ------------ | ------------------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------- |
| Route shapes | `dashboardRoutePath`, `createRoutePath`, `hubRoutePath`, `pageRoutePath` | No — Hapi's `routes.prefix` supplies it | At module load, when a controller builds its route table |
| Links        | `dashboardPath`, `createPath`, `hubPath`, `pagePath`                     | Yes, from `setBase()`                   | Per request, inside the set context                      |

A link builder used as a route shape gives Hapi a path that already carries the
prefix, which Hapi then prefixes again. A route builder used as a link drops
the prefix. Both now fail on the first request.

Anything that reads `request.path` sees the prefix too. Derive such a prefix
from a function, not a module-load constant — see
`sets/high-risk-plants/journeys/linear/flow/entry-guard.js`.

## 1. Choose the set id

Pick one kebab-case id. It names the `sets/<set-id>/` directory, the Hapi
plugin, the Nunjucks `TEMPLATES` root, the cookie-name prefix and the mount.

## 2. Declare the set's identity

Create `sets/<set-id>/set.js`, mirroring
[`../sets/high-risk-plants/set.js`](../sets/high-risk-plants/set.js):

```js
export const SET_ID = '<set-id>'
export const SET_BASE = `/${SET_ID}`
```

It is kept apart from the gateway so the router, the gateway and the tests can
name the set without importing the whole composition root.

## 3. Build the set's own layers

Create `sets/<set-id>/` with its obligations manifest, its journey config, its
flow modules and its features, following the `high-risk-plants` tree. Its cookie
names must be its own — all three of them:

```js
export const SESSION_COOKIE_NAMES = {
  knownJourneys: '<setId>KnownJourneys',
  openingRun: '<setId>OpeningRun',
  flowOnlyAnswers: '<setId>FlowOnlyAnswers'
}
```

Two sets sharing a cookie name would share the draft list behind it.

## 4. Write the gateway

Create `routes-<set-id>.js` following
[`../routes-high-risk-plants.js`](../routes-high-risk-plants.js) exactly: register the
mount, open the set context, install the sandboxed `onPreAuth`, configure every
seam this set uses with `SET_ID` first, register the journey cookies against
`SET_BASE`, install the sandboxed entry guard, and wrap every route.

The entry guard's own body goes inside `withSetContext(SET_ID, …)` — see rule 4
above. Copy [`../routes-high-risk-plants.js`](../routes-high-risk-plants.js)
lines 88-101 verbatim, comment included: `routeWithSetContext` does not reach a
server-level `server.ext`, and without the wrap the guard resolves only by the
sole-set fallback and throws the moment a second set mounts.

Then re-export it from [`../routes.js`](../routes.js), which is only a barrel.

`registerJourneyCookie(server, { base: SET_BASE })` takes no cookie names: it
reads them back from the configured session seam, so the cookies Hapi registers
and the cookies the session reads cannot drift apart. Call it after
`configureSession`.

## 5. Mount it

In [`../../router.js`](../../router.js):

```js
await server.register(yourSet, { routes: { prefix: YOUR_SET_BASE } })
```

Leave the server-wide routes where they are. Leave `/` as the chooser
registered by [`../../sets-index/index.js`](../../sets-index/index.js), which
returns 200 rather than redirecting: `/` belongs to no set (see "The mount
prefix is not a choice" above). Your set appears on it purely by mounting, so
there is no list to update, and the registry is read per request, so the
registration order does not matter.

## 6. Widen the dependency rules

`routes-<set-id>.js` is matched by the existing
`^src/server/app/routes-[a-z0-9-]+\.js$` entry in the
`routes-is-the-gateway` allowlist in `.dependency-cruiser.cjs`, so no change is
needed for a conventionally named gateway. Run `npm run lint:arch` and leave
`.dependency-cruiser-known-violations.json` untouched.

## 7. Prove it

`npm test` runs both co-residency suites. They read your gateway's source and
boot the real router, so a set wired wrongly fails here rather than in
production:

- [`../no-set-singletons.test.js`](../no-set-singletons.test.js) checks every
  gateway for setId-first seams, the mount registration, the `withSetContext`
  wrapper, the sandboxed extensions, the route wrapping and the cookie base.
- [`../co-residency.test.js`](../co-residency.test.js) boots the production
  router with a second set and checks that each set answers with its own
  configuration, that interleaved requests keep their own set, that cookies are
  scoped per set, and that the server-wide surface stays unprefixed.

Both shipped sets — `high-risk-plants` and `sample-journey` — are mounted in
those suites, and `test/fixtures/second-set.js` is mounted on top of them as a
THIRD set, a fixture rather than a real journey. If you are adding a real set,
the fixture stays: the suites are about the platform, not about any one set.

## 8. Move the tests with the URLs

A new set does not move existing URLs, but adding the FIRST prefix to a set did
— and any change to a set's mount does. The `trade-imports-animals-tests`
repository builds journey URLs from `page-objects/base/sets.ts`. Add your set's
base there and use it; do not spell the prefix out in a spec.

The frontend's own FIT specs build URLs from `BASE` in
`fit/set-base.js`, which re-exports `SET_BASE`. Give your set the
same single seam rather than literals in specs.

Cross-repo changes share one branch name across every affected repository, and
the frontend and tests changes land together — a split landing breaks the E2E
suite.
