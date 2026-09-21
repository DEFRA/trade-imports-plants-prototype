# High-risk-plants feature anatomy

The linear journey keeps pages under
`src/server/app/sets/high-risk-plants/journeys/linear/features/`. Each feature is
a vertical slice of page identity, controllers, copy, templates, bindings and
tests.

That folder holds one folder per feature, plus cross-feature constant modules
such as
[`timing-windows.js`](../journeys/linear/features/timing-windows.js) — values
more than one feature reads, written once there rather than repeated per
feature — and its two barrels:
[`index.js`](../journeys/linear/features/index.js), whose `dispatchPages` holds
the `meta` of every flow page and whose `allRoutes` spreads every feature's
routes, and
[`evaluation.js`](../journeys/linear/features/evaluation.js), whose frozen
`featureEvaluationBindings` holds one bundle per feature that binds a leaf.
Every rule below applies to each feature written into it.

`commodities/` is the shape a multi-page feature group takes: one `page.js`
holding both identities, one shared `copy/` pair, one `evaluation.js`, a folder
per page (`list/`, `details/`) holding that page's controller, template and
tests, and a `fit/` folder holding both browser specs and the axe helper they
share.

## Page identity

A `page.js` exports `{ id, slug }` and imports nothing. The controller spreads
the same object into `meta`, while
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js) uses it in
section order. Keeping the identity leaf import-free avoids a controller–flow
module cycle.

## Collecting controllers

A controller normally owns:

- `meta: { ...page, collects: [...] }`
- a shared render helper for GET and POST errors
- GET prefill from `state.get()`
- POST parsing and validation
- canonical writes through the engine
- navigation through `kit.nextTarget()`
- a GET and POST route pair from `kit.pageRoutes()`

Controllers use the platform engine, validation and shared-kit APIs. They do not
call the evaluator or the service persistence adapters directly.

[`journeys/linear/features/commodity-type/controller.js`](../journeys/linear/features/commodity-type/controller.js)
is the first collecting controller in this set and the smallest complete one.
[add-a-page.md](add-a-page.md) cites it as the minimal example.

## Copy and templates

User-facing text lives in English and Welsh copy modules beside the feature. A
template extends `shared/layout.njk`. The layout resolves from the
`src/server/app` Nunjucks root, while the feature view name starts with the
journey prefix from [`journeys/linear/config.js`](../journeys/linear/config.js):
`high-risk-plants/journeys/linear`.

A templated feature needs a complete copy folder — `copy/copy.en.js`,
`copy/copy.cy.js` and `copy/copy.test.js` — and both locales must have the
same shape. add-a-page.md links here rather than restating them.
[`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js)
and [`src/server/app/copy-parity.test.js`](../../../copy-parity.test.js) hold
the enforceable detail. Read them when a copy test fails.

## Bindings

Each collecting feature imports high-risk-plants obligation objects into its
`evaluation.js` and binds page fields with `scalar()` or `grouped()`.
[`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js)
exports all bundles as `featureEvaluationBindings`.

L1 gives that array to the generic fulfilment registry. Registration rejects
missing or duplicate leaf ownership, wrong group depth, inconsistent group
descriptors, and a binding that imports anything other than the manifest's own
obligation object.

## Controller and route registration

[`journeys/linear/features/index.js`](../journeys/linear/features/index.js)
exports:

- `dispatchPages`, containing every flow page `meta`, including a page whose
  `collects` is empty
- `allRoutes`, containing every controller route, including shell, action and
  off-flow pages without `meta`

`buildDispatch(dispatchPages)` builds page, slug and obligation-owner indexes.
L1 passes `allRoutes` to Hapi.

## Flow sections and task rows

A feature folder is not automatically a flow section or a hub row.

- `journeys/linear/flow/flow.js` defines navigation order.
- `journeys/linear/flow/task-rows.js` groups pages into hub work items.
- the hub feature's controller groups task-row ids for presentation.
- `journeys/linear/flow/run.js` defines the opening-run sequence.

See [Journey flow and gates](journey-flow-and-gates.md).

## Collections

Collections use hand-written controllers over generic engine operations. The
engine supplies collection facts and mutation primitives; the feature owns rows,
links, copy and validation. See
[Add a repeatable collection](add-a-collection.md).

## Client JavaScript

Prefer server-rendered controls. When a page genuinely needs a client bundle,
put its entry module under the feature, add a named `entry` to the repo-root
`webpack.config.js`, and load it from the template with
`getAssetPath('<entry>.js')`.

Missing the webpack entry is the failure to watch for: the template still
renders, the page looks fine, and the bundle URL returns a 404 that nothing
reports. Build config is load-bearing.

## Tests

Controller and copy tests sit beside the feature. Browser specs use
`*.fit.spec.js` and run in the Playwright `features` project. Feature tests
include initial-render and error-state accessibility checks. See
[Testing the high-risk-plants set and journey](testing.md).
