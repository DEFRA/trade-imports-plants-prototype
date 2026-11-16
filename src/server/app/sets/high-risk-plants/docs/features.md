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
tests, and a `fit/` folder holding both browser specs.

## Page identity

A `page.js` exports `{ id, slug, maturity }` (plus an authored `gate` where needed and `subPage: true` on a page reached only from the page that opens it) and imports nothing. The controller spreads
the same object into `meta`, while
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js) uses it in
section order. Keeping the identity leaf import-free avoids a controller–flow
module cycle.

## Page maturity

`maturity` is the page's level in the phase banner: one of the ids in
[`page-maturity/levels.js`](../../../page-maturity/levels.js) (`exploring`,
`detailing`, `agreed`, `readyForLive`), written as a string so `page.js` stays
import-free. A page that sets none is Exploring.

The banner reads the level from the page the matched route carries.
`kit.pageRoutes()` puts the page on each route it builds. A hand-written route
that renders a page uses `kit.pageRouteOptions(page)` in place of
`kit.routeOptions`. A feature with no `page.js` of its own, such as the hub, adds
one to hold its level. A route that carries no page, such as one that only
redirects, shows no level. The unauthorised page that sign-in can show takes its
level from [`auth/page.js`](../../../../auth/page.js).

A page's level changes through a reviewed pull request.

A page at `agreed` or `readyForLive` is signed off.

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

A feature owns the words it renders. When two features show the same string,
such as the commodity-type labels, each holds its own copy and its
`copy.test.js` checks it against the source list; neither imports the other.
A copy function takes a number the controller works with — a length limit, a
timing window — as an argument, so the number is written once. Provisional
copy is listed in [Copy status](copy-status.md).
[`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js)
and [`src/server/app/copy-parity.test.js`](../../../copy-parity.test.js) hold
the enforceable detail. Read them when a copy test fails.

## How a page ends

`shared/save-actions.njk` owns a page's ending.

- A page the overview links to directly ends with all three controls: the
  primary and "Save and return to overview" side by side, then "Cancel and
  return to overview" on its own line below them, so a trader can stop and
  leave from where the overview sent them.
- The two return controls name the page they lead to, which is headed
  "Overview". "Hub" is the internal name for it and never appears on screen.
- A page reached from another page ends with the primary alone
  (`showReturnControls: false`), and the trader leaves the way they came in.
- While a notification is being amended, a page ends exactly as it does on a
  draft: Save and continue, then Save and return to overview, then Cancel and
  return to overview wherever the draft page shows it. Save and continue goes on
  through the journey to check your answers, Save and return to overview goes to
  the Overview, and Cancel and return to overview goes to the Overview without
  saving the page. The status strip shows the Amend status and its Cancel amend
  link.

## Party edit

The party edit page reads `return` from the query string and accepts only the
check answers slug and the party pickers' slugs, a closed list, so a link
cannot send the trader to an arbitrary path. A party dropped by a change of
commodity type has nothing to edit, so the page sends the trader to the picker.

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

- `journeys/linear/flow/flow.js` defines the journey's one page order, the order
  Overview lists its tasks in, which Save and continue follows.
- `journeys/linear/flow/task-rows.js` groups pages into hub work items and decides
  when a notification is ready to submit. It decides nothing about where Save and
  continue goes.
- the hub feature's controller derives its groups from the flow sections, one per section that holds a task row's first page.

See [Journey flow and gates](journey-flow-and-gates.md).

## Collections

Collections use hand-written controllers over generic engine operations. The
engine supplies collection facts and mutation primitives; the feature owns rows,
links, copy and validation. See
[Add a repeatable collection](add-a-collection.md).

## Check answers and lateness

- Check your answers' Back link goes to where the trader came from: the last
  journey page, the Overview or the dashboard, on a draft, an amendment and a
  submitted notification alike. Reached any other way it goes to the Overview on a
  draft or an amendment and to the dashboard on a submitted notification. See
  [Back on check your answers](journey-flow-and-gates.md#back-on-check-your-answers).
- The error summary lists answer and copied-address errors first, then one
  entry per unfinished card in page order. A card already named by an answer
  or address error is not named again.
- An address error links to the page that edits the copied address, which
  returns to check answers. A card entry links to the card on the page.
- Every task row belongs to exactly one card, and
  `view-model/incomplete-cards.test.js` checks it. A card is unfinished when
  `rowReady` says one of its rows is not ready, the same predicate
  `readyForCheckYourAnswers` uses, so "no unfinished card" and "ready to
  submit" always agree.
- Commodity cards are one per line and carry no id, so the commodities entry
  links to the heading of the commodities section.
- The consignor card shows only while the consignor is in scope. Out of scope
  its row is not applicable, so it is never named.
- A submitted notification shows no answer errors. An amendment shows none
  until its Continue is refused.
- The late warning on a draft is worked out from the request's clock. Once
  submitted, the confirmation page, the read-only check answers page and the
  dashboard's Late tag read the stored `lateNotificationIndicator`, set when
  the notification is first submitted and never worked out again. The stored
  value is `late` or `on-time`, so the dashboard row narrows it to a boolean.
- Dates are shown as the Europe/London calendar day, through
  `review/notification-date.js`. The arrival date of a consignment that has
  already arrived is capped at today in Europe/London (regulation 26(2)(a));
  no other bound applies, because a late notification is accepted and flagged.

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
