# How to add a page

Use this recipe for one new journey page. Use [add-a-section.md](add-a-section.md)
when several new pages form one feature group and one hub task row.

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/app/sets/high-risk-plants/`.

## Read these files first

`commodity-type` is the smallest complete page in this set: one collecting
field, one obligation, one template, both copy bundles and one feature spec.
Copy its shape. It is also the worked example for a validated field — the
`commodityType` obligation is required, and its fit spec establishes the
initial-render plus error-state accessibility pattern.

- [`journeys/linear/features/commodity-type/page.js`](../journeys/linear/features/commodity-type/page.js)
- [`journeys/linear/features/commodity-type/controller.js`](../journeys/linear/features/commodity-type/controller.js)
- [`journeys/linear/features/commodity-type/template.njk`](../journeys/linear/features/commodity-type/template.njk)
- [`journeys/linear/features/commodity-type/evaluation.js`](../journeys/linear/features/commodity-type/evaluation.js)
- [`journeys/linear/features/commodity-type/copy/copy.en.js`](../journeys/linear/features/commodity-type/copy/copy.en.js)
- [`journeys/linear/features/commodity-type/copy/copy.cy.js`](../journeys/linear/features/commodity-type/copy/copy.cy.js)
- [`journeys/linear/features/commodity-type/copy/copy.test.js`](../journeys/linear/features/commodity-type/copy/copy.test.js)
- [`journeys/linear/features/commodity-type/controller.test.js`](../journeys/linear/features/commodity-type/controller.test.js)
- [`journeys/linear/features/commodity-type/commodity-type.fit.spec.js`](../journeys/linear/features/commodity-type/commodity-type.fit.spec.js)
- [`obligations/sections/commodity.js`](../obligations/sections/commodity.js)

These pages take the same shape as the animals set's, but they never import
from it. Read the files above, not the animals paths; the animals paths do not
exist in this repository.

The three registration modules the page has to reach do already exist, empty.
Read them before registering anything:

- [`journeys/linear/features/index.js`](../journeys/linear/features/index.js)
- [`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js)
- [`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js)

A page increment may also close one of the gates listed in the
[set README](README.md#gates-on-the-first-journey-page-increment). The entry
guard was the first of them: it is restored, against `commodity-type`, in the
increment immediately after the one that landed that page — the guard needs the
entry page's identity, so it follows rather than shares the increment.

## 1. Define the page identity and files

Create this feature folder:

```text
journeys/linear/features/<name>/
├── controller.js
├── controller.test.js
├── copy/
│   ├── copy.cy.js
│   ├── copy.en.js
│   └── copy.test.js
├── evaluation.js
├── page.js
├── template.njk
└── <name>.fit.spec.js
```

If the page joins an existing multi-page feature, add its controller and
template inside that group. Keep the browser spec in that group's `fit/` folder.

`page.js` exports only `{ id, slug }` and imports nothing. The controller and
flow import the same object. This prevents a module cycle through flow, status
and the controller.

Create both locale bundles and their test as soon as the template exists.
[features.md](features.md#copy-and-templates) states what the copy tests
require.

## 2. Add the model and binding

Follow [add-a-field.md](add-a-field.md) for every field the page collects.
In order:

1. Add each copy-free obligation under `obligations/sections/` (create the
   folder if this is the first).
2. Re-export it and add it to the array in
   [`obligations/index.js`](../obligations/index.js).
3. Bind it in the feature's `evaluation.js`, importing the obligation object
   from the manifest, not a copy of it.
4. Register the new binding bundle in
   [`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js).

Do not put display text, options or validation rules in the obligation model.
Copy stays in the feature's `.njk` and copy files. Validation stays in the
controller. `assertObligationPurity()` runs at boot, so a display-shaped key
stops the server starting.

Run `npm run test:high-risk-plants` after adding the obligation. Vitest setup
reports an unowned leaf before the binding exists. After the binding exists,
tests that build dispatch report the obligation as collected by no page. Step 3
satisfies dispatch coverage.

## 3. Write the controller

Export `meta` by spreading the page identity and listing every obligation this
page owns:

```js
export const meta = { ...page, collects: ['fieldName'] }
```

Use `collects: []` only when the page owns no obligation or edits a collection
whose root another page already owns.

Use one `render()` helper for GET and POST errors. Build the common view with
`kit.base()`. Pass `journey` so the shared reference strip renders. A page that
shows no status strip still passes `journey`, with `showJourneyStrip: false`.
Pass `page` so the section caption renders. The normal back link is `hubPath(journey.journeyId)`.
A page that is a step of the opening run takes its back link from
`kit.runBackLink()`, which opens the previous run step while the run is active
and falls back to the overview.

GET calls `state.get()` once and prefills from `answers`. POST:

1. reads raw payload values
2. validates with [`src/server/app/lib/validate/index.js`](../../../lib/validate/index.js)
3. re-renders raw values with status 400 on error
4. commits cleaned values with `state.commit()`
5. redirects through `await kit.nextTarget(request, page, committed.scope)`

Wrap the write in `kit.recoverableSave(request, …)`. A marked persistence
failure is logged once by `recoverableSave`; render the same values with
`recoverableError: true` and status 500. Unexpected errors must throw. When
validation fails, render the page again with status 400 and log nothing: a user's
own field errors shown back on the form are not logged. A refusal that is not the
user's input error (a state refusal, a bare 400, another service refusing) logs
once through `kit.logRefusal(request, { …details })` with the journey id.

"Save and return to overview" posts `exit=hub`. When the page has a required
rule, opt in to saving a blank answer on that exit by passing
`{ allowMissing: kit.isHubExit(request) }` to `validate`, as
[`journeys/linear/features/commodity-type/controller.js`](../journeys/linear/features/commodity-type/controller.js)
does. Every other rule still refuses. An address-book picker does not call
`validate`: it resolves the save through `resolveSelectionOnSave` in
[`journeys/linear/features/address-book-picker/save-selection.js`](../journeys/linear/features/address-book-picker/save-selection.js),
so a save with nothing ticked always leaves without a commit and an id the book
does not hold is refused.

These task-row pages offer no overview exit and stay strict on every submit:

- the commodities list
  ([`journeys/linear/features/commodities/list/list.controller.js`](../journeys/linear/features/commodities/list/list.controller.js))
- commodity details
  ([`journeys/linear/features/commodities/details/details.controller.js`](../journeys/linear/features/commodities/details/details.controller.js))

Export the standard routes:

```js
export const routes = kit.pageRoutes(page, { get, post })
```

Use explicit Hapi route objects only when the page needs more than this GET and
POST pair.

## 4. Add copy and the Nunjucks view

Put all user-facing text in `copy/copy.en.js` and `copy/copy.cy.js`. Keep both
bundles the same shape and resolve them with `copyFor({ en, cy })` — see
[features.md](features.md#copy-and-templates).

Extend `shared/layout.njk`, which resolves from the `src/server/app` Nunjucks
root. Include the shared error summary and save actions. Render fields with
GOV.UK or MoJ macros — stay inside the govuk-frontend toolbox rather than
hand-rolling components or custom CSS. Keep each input name, input id and
validation error key the same so an error-summary link focuses the control.

Import `TEMPLATES` from
[`journeys/linear/config.js`](../journeys/linear/config.js) in the controller and
build the view name below its `high-risk-plants/journeys/linear` prefix. Do not
prefix the shared layout: `LAYOUT` is `shared/layout.njk` and resolves from the
other Nunjucks root.

Section captions are wired (see
[journey-flow-and-gates.md](journey-flow-and-gates.md#section-captions)), so
`caption` holds the section name for any page the caption map claims. Import
the macro with `{% from "shared/section-caption.njk" import sectionCaption %}`
and call `{{ sectionCaption(caption) }}` immediately above the page heading,
passing the caption size that matches the heading, with nothing between the
two. The macro renders nothing for a page the map leaves bare, so the call is
safe either way.

Run `npm run test:high-risk-plants`. Fix local copy tests,
[`copy-convention.test.js`](../../../copy-convention.test.js) and
[`copy-parity.test.js`](../../../copy-parity.test.js) before continuing.

## 5. Register routes and dispatch

Import the controller namespace in
[`journeys/linear/features/index.js`](../journeys/linear/features/index.js).

- Add `meta` to `dispatchPages` when the controller exports it. This includes a
  page with `collects: []`, because its id and slug must be indexed for gates
  and navigation.
- Spread `routes` into `allRoutes`.

`src/server/app/routes-high-risk-plants.js` — this set's gateway, re-exported by
the `routes.js` barrel — wraps `allRoutes` in its set context and passes them to
Hapi. `buildDispatch(SET_ID, dispatchPages)` rejects an unsafe obligation name,
two page owners and an uncovered obligation.

Run `npm run test:high-risk-plants`. Dispatch should now build. If it does not,
correct `meta.collects` or the `dispatchPages` registration. Do not add a second
owner to silence coverage.

## 6. Place the page in the journey and hub task row

Import the page identity into
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js). Put it in the
right `sections` entry, or add the first section. Its position controls
strictly-earlier prerequisites and where Save and continue goes outside the
opening run (`nextInTaskRow()`: the next page of the section only when it is in
the same task row).

Import it into
[`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js). Put
it in an existing task row when those pages form one user task. Add a task row
only when the page needs its own entry on the hub. A task row is the hub entry;
a flow section is the navigation sequence.

Decide the page's caption in
[`journeys/linear/flow/section-captions/`](../journeys/linear/flow/section-captions/index.js):
add it to the section it belongs to, or to the `BARE` list in that folder's
test. The coverage test fails until you do one or the other.

If you add a task row, also:

- add the row id to one `GROUPS` entry in the hub feature's controller
- add matching English and Welsh `rows` copy in the hub feature
- update the hub's `copy/copy.test.js`, the hub feature spec and
  `journeys/linear/flow/task-rows.test.js`

The hub feature is the worked example for those bullets.

- [`journeys/linear/features/hub/controller.js`](../journeys/linear/features/hub/controller.js)
  holds `GROUPS` — the numbered groups in the order the hub renders them, each
  naming its row ids. It turns a row id into a task-list item: a row
  whose gate passes gets its `rowEntry()` link and a status tag, a row whose
  gate fails gets the "Cannot start yet" status and no link, and a conditional
  row that is not applicable is dropped. A group with no items is not rendered.
- [`journeys/linear/features/hub/copy/copy.en.js`](../journeys/linear/features/hub/copy/copy.en.js)
  and
  [`journeys/linear/features/hub/copy/copy.cy.js`](../journeys/linear/features/hub/copy/copy.cy.js)
  hold the four group captions, the five statuses — completed, optional, in
  progress, not yet started and cannot start yet, whose presentation lives in
  the controller as three `govuk-tag` classes, plain text for optional and a
  task-list status class for cannot start yet — and a `rows` map with each
  row's `title` and `hint`. Your row's `title` and `hint` join them under
  `rows` in both locales.
- [`journeys/linear/features/hub/copy/copy.test.js`](../journeys/linear/features/hub/copy/copy.test.js)
  checks the English bundle leaf by leaf, names the four groups in the design
  order in both locales, holds the controller and the captions to the same set
  of groups, and holds 'Should hold only the rows the journey has landed', which
  asserts the ordered list of row keys — that is the assertion your row breaks,
  and each new row also needs its own leaf assertion. The Welsh leaves are
  covered set-wide by
  [`copy-parity.test.js`](../../../copy-parity.test.js).
- [`journeys/linear/features/hub/template.njk`](../journeys/linear/features/hub/template.njk)
  renders each group as a heading and one `govukTaskList`, so a new row needs no
  template change.
- [`journeys/linear/features/hub/controller.test.js`](../journeys/linear/features/hub/controller.test.js)
  and
  [`journeys/linear/features/hub/hub.fit.spec.js`](../journeys/linear/features/hub/hub.fit.spec.js)
  both pin the rows landed so far, group by group, and must be extended with
  your row.
- [`journeys/linear/flow/task-rows.test.js`](../journeys/linear/flow/task-rows.test.js)
  proves that state from the flow side — `taskRows` holds the rows landed so far
  and `taskRowById()` resolves each of them — and that every id a `GROUPS` entry names
  resolves to a task row or the review row. It covers `rowParts()` and
  `rowStatus()` over fixture rows: an explicit `parts` list wins over the
  obligations the row's pages collect, an out-of-scope row is not applicable,
  and an in-scope row nobody has answered is optional.

`pageGatePasses()` derives the normal gate from `collects` plus earlier
continue-enforced fields. Add an authored `gate` to the page identity only when
that rule cannot express the page.

Add the page to [`journeys/linear/flow/run.js`](../journeys/linear/flow/run.js)
only when it belongs in the opening run — that is, add it to `RUN_STEPS` in
journey order. A step whose derived gate fails is skipped, as arrival-status is
for potatoes. A run step names its `backCandidates`, the earlier steps its Back
link may open, nearest first. Inserting a step mid-run updates the following
step's `backCandidates`. The controller's `render` takes its Back link from
`kit.runBackLink(request, page.id, current, { fallback })`, where `fallback` is
a named option that defaults to the overview. Update its run tests if you do.

## 7. Add check-answers and backend mapping when needed

Add the page's rows to the matching check-answers card and their row labels to
both check-answers copy bundles. A stored code is shown through a copy lookup
keyed by the stored value, as the review does with
`copy.typeLabels[answers.commodityType]` and
`copy.statusLabels[answers.arrivalStatus]`, never retyped into the row. Value
labels only the review shows go in the check-answers copy bundles.

Pass each obligation name to `row()` or `changeAction()` so the
dispatch index builds the Change URL. Extend the check-answers feature spec.

Canonical persistence is complete once the feature binding is registered. If the
backend notification shape also has a home for a new field, update the matching
module under
[`src/server/app/services/persistence/records/notification-mapper/`](../../../services/persistence/records/notification-mapper/index.js)
and its test — the first mapper field to be added creates
`notification-mapper.test.js`, which does not exist yet.
There is one mapper here, Mapper A. If there is no backend field home, leave the
mapper unchanged and assert the omission. Do not invent one.

## 8. Register client JavaScript when needed

Most pages need no page-specific JavaScript. If this page does:

1. Add a feature entry module at
   `journeys/linear/features/<name>/client/index.js`.
2. Add a named `entry` to the repo-root `webpack.config.js`.
3. Load it in the template with `getAssetPath('<entry>.js')`.

If the webpack entry is missing, the template renders and the bundle returns a
silent 404.

## 9. Add unit and contract tests

Add the controller's valid POST to `src/server/app/contract.test.js`. Supply a
valid payload and any seed that brings conditional obligations into scope. The
case must commit exactly the committable names in `meta.collects`.

That table already holds the `commodity-type` case; add yours beside it.

This contract table is manual. A new controller that is absent from the table
does not make the test fail, so add the case even when the suite is green.
Run `npm test` to exercise it; `npm run test:high-risk-plants` does not include
L1 contract tests.

In `controller.test.js`, cover:

- GET prefill and view model
- every validation rule
- raw values and no commit on a 400 response
- cleaned values and redirect on success
- conditional fields and gates
- recoverable persistence failure returning 500
- unexpected errors throwing

Add or update flow tests for section order, skip behaviour, task-row entry,
status and opening-run behaviour.

## Test support

Build test set-up from the shared helpers, and extend them rather than writing
set-up in the test file:

- controller tests:
  [`engine/test-support.js`](../../../engine/test-support.js) exports:
  - `driveHandler` seeds a journey, runs one handler and returns the answers
    before and after and the logger; its `openingRun` option (`RUN_ACTIVE` or
    `RUN_COMPLETE`) records that phase of the opening run, and `saveFailure`
    makes every save the handler makes fail with the error it is given
  - `postHandlerOf` and `postHandlerEndingWith` return a feature module's POST
    handler
  - `journeyRequest`, `stubH`, `recordingH` and `recordingLogger` build the
    request, toolkit and logger
  - `expectBackLinkIsPage` and `expectBackLinkIsPath` assert the Back link
  - `expectOneRefusalLogged` asserts the logger holds exactly one refusal line
  - `expectOneSaveFallbackLogged` asserts it holds exactly one save fallback line
  - `unavailableBackendError` builds the error a save failure is given
  - `itHoldsCopyAtEveryLeaf` registers the copy-leaf test for a locale pair
- address-book picker tests:
  [`address-book-picker/controller-test-support.js`](../journeys/linear/features/address-book-picker/controller-test-support.js)
  — `describeAddressBookPickerController` registers the controller tests every
  picker shares, and a picker's call also names the previous run step's slug and
  the answers that make that step apply;
  [`address-book-picker/test-support.js`](../journeys/linear/features/address-book-picker/test-support.js)
  — `pickerViewModelSuites` builds the view model and paging test cases, and
  `bookHoldingADeletedRecord` fakes an address book holding a deleted record,
  with `DELETED_ID`, `NOT_IN_THE_BOOK` and `okJson`
- the set's journey and seed data:
  [`journeys/linear/test-support.js`](../journeys/linear/test-support.js) —
  `installHighRiskPlantsJourney`, `useStubbedHighRiskPlantsJourney` (the stub
  records, session and dispatch with a cleared store for a describe),
  `COMPLETE_NOTIFICATION` and
  `COMPLETE_POTATO_CONSIGNMENT`
- browser tests:
  [`fit/high-risk-plants-journey.js`](../../../../../../fit/high-risk-plants-journey.js)
  — see [Shared browser-test helpers](testing.md#shared-browser-test-helpers)

When a second test needs the same set-up, move it into one of these helpers in
the same change and delete every local copy. Importing a sibling feature's test
helper is fine.

## Logging

A user's own field errors shown back on the form are not logged. A refusal that is not the user's input error (a state refusal, a bare 400, another service refusing) logs once through `kit.logRefusal()` with the journey id, and every save fallback logs through `kit.recoverableSave()`; see "Logging" in [`architecture.md`](../../../docs/architecture.md).

## Playwright feature test

Keep the spec with the feature. A small feature uses
`journeys/linear/features/<name>/<name>.fit.spec.js`. A multi-page feature uses
`journeys/linear/features/<group>/fit/<page>.fit.spec.js`.

Make every test independent and give it a new notification. Do not use page
objects. Use raw role, label and visible-copy locators. Use locator assertions
and Playwright auto-waiting. Use `expect.poll` when waiting for state without a
locator. Never use a sleep.

Cover:

- initial render, heading, copy, hints, controls and service-backed options
- happy-path save and the correct next-page or hub redirect
- reload and persistence of every entered value
- each validation rule in its own test
- preservation of entered values on error
- every error-summary link moving focus to its control
- back, Save and return to overview, Cancel and Change navigation as applicable
- on every page in a task row's `pages` (`journeys/linear/flow/task-rows.js`) and on every party picker, `amend: amend` in the object `saveActions` takes, so the page takes the amend ending (Save and return, Save and continue, Save and return to overview) while the notification is being amended. `kit.base()` supplies `amend` when the controller passes it the request (`request`, or `h.request` where the render has only the toolkit). The party pickers (consignor-select, place-of-destination, consignment-contact-select) also pass `hubExitWhileAmending: false`, so they show only Save and return and Save and continue while amending, and keep their three controls outside an amendment. A page reached from another page (`showReturnControls: false`, such as the commodities list) also passes `amend`, and shows only Save and return and Save and continue while amending. A collection-entry sub-page (commodities details) keeps its own write actions and passes no `amend`: it saves back to its list, which carries the row's amend ending. `features/amend-endings.test.js` renders every task-row page while amending and fails if one loses the ending.
- conditional scope, skip and purge behaviour
- the check-answers rows and Change links

## Accessibility test

Add one axe check for the initial render and one for the validation error state.

Call `expectNoSeriousOrCriticalViolations(page, subject)` from
[`fit/high-risk-plants-journey.js`](../../../../../../fit/high-risk-plants-journey.js).
Do not build `AxeBuilder` in a spec.

[`journeys/linear/features/commodity-type/commodity-type.fit.spec.js`](../journeys/linear/features/commodity-type/commodity-type.fit.spec.js)
establishes that pattern for a validated field: one axe check on the initial
render and one on the error state left by continuing with nothing chosen.

## 10. Run every check

```bash
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run lint
```

Green means every command exits with code 0, Vitest has no failed tests,
Playwright has no failed specs, and lint has no errors.
