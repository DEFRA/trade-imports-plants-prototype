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

`page.js` exports `{ id, slug, maturity }`, an authored `gate` where the derived gate cannot express the page, and `subPage: true` on a page reached only from the page that opens it, and imports nothing. `maturity` is the
page's level in the phase banner, as a level id from
[`page-maturity/levels.js`](../../../page-maturity/levels.js); a new page in a
notification journey takes the level its section's pages have
([features.md](features.md#page-maturity)). The controller and
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
Pass `page` so the section caption renders. A journey page takes its back link from
the shared Back rule, `kit.trailBackLink(request)`, which reads where the trader came
from off the link or form and falls back to the overview when the request names none.
A page names no fixed Back target and no list of earlier pages its Back may open. A
page with a different fallback
passes it: `kit.trailBackLink(request, { fallback })`. A link that moves the trader on
pushes the page onto the trail with `kit.pushTrail()`, and a link that brings the
trader back to the same page carries it with `kit.carryTrail()`.

GET calls `state.get()` once and prefills from `answers`. POST:

1. reads raw payload values
2. validates with [`src/server/app/lib/validate/index.js`](../../../lib/validate/index.js)
3. re-renders raw values with status 400 on error
4. commits cleaned values with `state.commit()`
5. redirects through `kit.nextTarget(request, page, committed.scope)`, the shared
   next-page target: the next page in the journey's one page order that applies,
   ending at check your answers. Save and continue sends the trader to the page
   that asks for a missing required earlier answer; see
   [`journey-flow-and-gates.md`](journey-flow-and-gates.md)

Wrap the write in `kit.recoverableSave(request, …)`. A marked persistence
failure is logged once by `recoverableSave`; render the same values with
`recoverableError: true` and status 500. Unexpected errors must throw. When
validation fails, render the page again with status 400 and log nothing: a user's
own field errors shown back on the form are not logged. A refusal that is not the
user's input error (a state refusal, a bare 400, another service refusing) logs
once through `kit.logRefusal(request, { …details })` with the journey id.

"Save and return to overview" posts `exit=hub`. It runs the same validation as
"Save and continue", with no opt-in, and only changes where a valid save goes. An
address-book picker does not call
`validate`: it resolves the save through `resolveSelectionOnSave` in
[`journeys/linear/features/address-book-picker/save-selection.js`](../journeys/linear/features/address-book-picker/save-selection.js),
so a save with nothing ticked always leaves without a commit and an id the book
does not hold is refused.

These task-row pages offer no overview exit:

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
Hapi. Its wiring passes the journey flow its sections, task rows and policy and no
routing targets: where Save and continue goes comes only from the page order.
`buildDispatch(SET_ID, dispatchPages)` rejects an unsafe obligation name,
two page owners and an uncovered obligation.

Run `npm run test:high-risk-plants`. Dispatch should now build. If it does not,
correct `meta.collects` or the `dispatchPages` registration. Do not add a second
owner to silence coverage.

## 6. Place the page in the journey and hub task row

Import the page identity into
[`journeys/linear/flow/flow.js`](../journeys/linear/flow/flow.js). Put it in the
right `sections` entry, or add the first section. A new question page goes into the
journey's one page order and its task row and nothing else. Its position controls
strictly-earlier prerequisites and the journey's page order, which Save and
continue follows from every start: the next page that applies, skipping a
sub-page, which is a page reached only from the page that opens it. Its place in that
order decides where Save and continue lands on it and on the page before it. Save and
continue sends the trader to the page that asks for a missing required earlier answer;
see [`journey-flow-and-gates.md`](journey-flow-and-gates.md). A
page stays out of the order as a `subPage: true` page when only the page that opens it
reaches it, in no section when it is a detour off a list page, and in no task row when
it is the review, declaration or confirmation.

Import it into
[`journeys/linear/flow/task-rows.js`](../journeys/linear/flow/task-rows.js). Put
it in an existing task row when those pages form one user task. Add a task row
only when the page needs its own entry on the hub. A task row places pages on
Overview and decides readiness; it does not change where Save and continue goes.

Decide the page's caption in
[`journeys/linear/flow/section-captions/`](../journeys/linear/flow/section-captions/index.js):
add it to the section it belongs to, or to the `BARE` list in that folder's
test. The coverage test fails until you do one or the other.

If you add a task row, also:

- the hub lists the row under the section that holds its first page; a new section needs a caption under `groups` in the hub copy
- add matching English and Welsh `rows` copy in the hub feature
- update the hub's `copy/copy.test.js`, the hub feature spec and
  `journeys/linear/flow/task-rows.test.js`

The hub feature is the worked example for those bullets.

- [`journeys/linear/features/hub/controller.js`](../journeys/linear/features/hub/controller.js)
  derives the numbered groups from the flow sections, in the order the hub
  renders them, then appends the check-and-submit group. It turns a row into a task-list item: a row
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
  and `taskRowById()` resolves each of them — and that every row has hub copy
  title. It covers `rowParts()` and
  `rowStatus()` over fixture rows: an explicit `parts` list wins over the
  obligations the row's pages collect, an out-of-scope row is not applicable,
  and an in-scope row nobody has answered is optional.

`pageGatePasses()` derives the normal gate from `collects` plus earlier
continue-enforced fields. Add an authored `gate` to the page identity only when
that rule cannot express the page.

A page's place in Save and continue's order is its place in `journeySections()`; a
page whose scope rule fails is skipped, as arrival-status is for potatoes, and a page
missing a required earlier answer sends Save and continue to the page that asks for
it. Its Back
comes from `kit.trailBackLink()`: no other file lists it. See
[`journey-flow-and-gates.md`](journey-flow-and-gates.md), "Entry guard and the Back
link".

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
status and Back from each entry point, through itSendsBackToWhereTheTraderCameFrom.

## Test support

Build test set-up from the shared helpers, and extend them rather than writing
set-up in the test file:

- controller tests:
  [`engine/test-support.js`](../../../engine/test-support.js) exports:
  - `driveHandler` seeds a journey, runs one handler and returns the answers
    before and after and the logger; its `amend` option opens an amendment, its
    `query` option carries a trail, and `saveFailure` makes every save the handler
    makes fail with the error it is given
  - these drive a page from every start: a new notification (a `trailQuery` of the
    dashboard start place), a reopened draft (a seeded journey with no
    trail), the Overview (a `trailQuery` of the Overview place), a new browser
    session (`driveHandler` with no session state, the default), a check your
    answers Change link (`reviewChangeLinkQuery`) and an amendment (`amend`)
  - `postHandlerOf` and `postHandlerEndingWith` return a feature module's POST
    handler
  - `useStubbedJourney(setId, dispatchPages)` configures the stub records and
    session and builds the dispatch before a describe, and restores the stub
    records and clears the store before each test; a test that never installs
    the real journey passes the fixture `dispatchPages` from `test/fixtures/`
  - `useBackendRecords(setId)` configures the real records and the stub session
    before a describe, enables the shared `fetchMock` and clears its calls
    before each test, and resets the mocks and config after each test;
    `useStubbedJourney` and `useBackendRecords` go on sibling describes, never
    nested
  - `journeyRequest`, `stubH`, `recordingH` and `recordingLogger` build the
    request, toolkit and logger
  - `stubH(request, { writesStateToRequest: true })` writes each cookie it is
    given onto `request.state`
  - `requestAsSessionHoldingNoJourney` runs a GET and a POST handler as a
    session that holds no journey
  - `resetMocksAndConfigAfterTests` registers the reset of fetch mocks and
    config after each test
  - `restoreConfigAfterEach(keys)`, from
    [`common/test-helpers/restore-config-after-each.js`](../../../../common/test-helpers/restore-config-after-each.js),
    restores those config keys after each test; every other helper that
    restores config uses it
  - `useReferenceDataServing` registers `resetMocksAndConfigAfterTests()` for the
    describe that calls it, and returns the function that serves given rows as
    the reference-data response
  - `fetchMock` is the shared `vitest-fetch-mock` instance that
    `useBackendRecords`, `addressBookAnswering` and `useReferenceDataServing`
    drive; a test enables it and sets its response, with
    `resetMocksAndConfigAfterTests()` registered
  - `addressBookAnswering`, `addressBookRefusingAddresses` and
    `addressBookRequestUrls` put the address book on the network boundary and
    report the requests made to it
  - `expectBackLinkIsPage` and `expectBackLinkIsPath` assert the Back link
  - `trailQuery(...places)` and `reviewChangeLinkQuery()` build the query of a
    request that carries a trail, newest place last
  - `itSendsBackToWhereTheTraderCameFrom`, from
    [`journeys/linear/test-support.js`](../journeys/linear/test-support.js),
    registers the Back cases of a page; it takes the GET handler and an options
    object with an optional `seed` and the `previousPage` slug
  - `itSendsBackToWhereTheTraderCameFromOnRefusal`, from the same file, registers
    the test that the page shown again after a refused save keeps its Back; it takes
    the POST handler and an options object with the refused `payload`, the
    `savedPage` slug Save and continue was pressed on and an optional `seed`
  - `expectOneRefusalLogged` asserts the logger holds exactly one refusal line,
    and `expectNoRefusalLogged` asserts it holds none
  - `expectOneSaveFallbackLogged` asserts it holds exactly one save fallback line
  - `unavailableBackendError` builds the error a save failure is given
  - `itHoldsCopyAtEveryLeaf` registers the copy-leaf test for a locale pair
- address-book picker tests:
  [`address-book-picker/controller-test-support.js`](../journeys/linear/features/address-book-picker/controller-test-support.js)
  — `describeAddressBookPickerController` registers the controller tests every
  picker shares, and a picker's call names the page Save and continue was
  pressed on before it and the answers that make that page apply;
  [`address-book-picker/test-support.js`](../journeys/linear/features/address-book-picker/test-support.js)
  — `pickerViewModelSuites` builds the view model and paging test cases, and
  `addressResponseForABookHoldingADeletedRecord` is the address response for a
  book holding a deleted record, served through `addressBookAnswering`, with
  `DELETED_ID` and `NOT_IN_THE_BOOK`
- rendered-template tests:
  [`common/test-helpers/document-of.js`](../../../../common/test-helpers/document-of.js)
  — `documentOf` parses rendered HTML into a document and `trimmedTextOf` gives
  an element's trimmed text
- the set's journey and seed data:
  [`journeys/linear/test-support.js`](../journeys/linear/test-support.js) —
  the global test setup installs the journey-neutral fixture set from
  `test/fixtures/`, so engine and model tests do not depend on the installed
  set; a test that drives this journey's controllers installs the real journey
  with `useStubbedHighRiskPlantsJourney`, which installs the journey and then
  uses `useStubbedJourney`; `installHighRiskPlantsJourney` installs the journey
  and builds its dispatch for a test that wires its own stores;
  `COMPLETE_NOTIFICATION` answers every built section on a potato consignment,
  and `COMPLETE_POTATO_CONSIGNMENT` is a potato consignment whose commodities
  section is complete
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
- happy-path Save and continue landing on the next page in the journey order, or on
  check your answers from the last page
- reload and persistence of every entered value
- each validation rule in its own test
- preservation of entered values on error
- every error-summary link moving focus to its control
- Back returning to the page the trader came from, Save and return to overview,
  Cancel and Change navigation as applicable
- the same controls while amending as on a draft: every page passes `saveActions` the same arguments on a draft and while amending. `features/amend-endings.test.js` renders every task-row page on a draft and while amending, checks each one for those controls and fails if their endings differ.
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
