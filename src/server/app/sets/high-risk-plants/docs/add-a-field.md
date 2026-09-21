# How to add a field

Use this recipe for a scalar field on an existing page. For a field inside a
repeatable group, also follow [add-a-collection.md](add-a-collection.md).

Run every command from the frontend repo root. All other paths in this recipe
are relative to
`src/server/app/sets/high-risk-plants/`.

## Read these files first

`arrival-details` is the worked example for a page of several fields: a date
whose label switches with the state the notification is in, a time and a place
of landing that only potato notifications are asked for, a service-backed
option list behind a type-ahead, and a validation rule per field. Copy its
shape.

- [`obligations/sections/arrival.js`](../obligations/sections/arrival.js) —
  `arrivalDate` unconditional, `arrivalTime` and `proposedPlaceOfLanding` behind
  one `equalsGate` on the commodity type
- [`journeys/linear/features/arrival-details/evaluation.js`](../journeys/linear/features/arrival-details/evaluation.js)
- [`journeys/linear/features/arrival-details/controller.js`](../journeys/linear/features/arrival-details/controller.js)
  — `scope.has()` decides what is rendered, what is validated and what is
  committed
- [`journeys/linear/features/arrival-details/template.njk`](../journeys/linear/features/arrival-details/template.njk)
- [`journeys/linear/features/arrival-details/copy/copy.en.js`](../journeys/linear/features/arrival-details/copy/copy.en.js)
  and
  [`copy/copy.cy.js`](../journeys/linear/features/arrival-details/copy/copy.cy.js)
  — the switching label as a map keyed on state, never a sentence chosen in the
  model
- [`journeys/linear/features/arrival-details/controller.test.js`](../journeys/linear/features/arrival-details/controller.test.js)
- [`journeys/linear/features/arrival-details/arrival-details.fit.spec.js`](../journeys/linear/features/arrival-details/arrival-details.fit.spec.js)

It is also the worked example for a field that **normalises input before it
saves**: the date arrives as `d/m/yyyy` text from the MoJ picker and is stored
as the `{ day, month, year }` parts object. `committedValues()` in that
controller does the conversion after validation, and
[`arrival-bounds.js`](../journeys/linear/features/arrival-details/arrival-bounds.js)
beside it returns the one bound the date has in both the shapes its two
consumers need.

Read the platform guides alongside it —
[Validation](../../../docs/validation.md),
[Scope and wipe](../../../docs/scope-and-wipe.md) and
[Feature anatomy](features.md).

## 1. Add the obligation and run the focused tests

Add the obligation to the matching file under `obligations/sections/`. That
folder does not exist yet; the first field creates it and its module.
Give the obligation:

- a new UUID `id`
- a path-safe `name` with no `.`, `[` or `]`
- `status: 'mandatory'` or `status: 'optional'`, unless an `applyTo` helper
  supplies the status

Use `within` for a collection member. Use a helper from
[`src/server/app/model/obligations/helpers/index.js`](../../../model/obligations/helpers/index.js)
when another answer controls scope or mandate. The helper metadata must name its
dependency.

Import and export the object in
[`obligations/index.js`](../obligations/index.js), then add it to the
`obligations` array.

Do not put a label, title, hint, legend, option or other display logic in the
model. Obligations and domain code stay copy-free. Copy belongs to the feature.
[`src/server/app/obligation-purity.js`](../../../obligation-purity.js) enforces
this at boot — the server refuses to start, it is not merely a red test.

Run:

```bash
npm run test:high-risk-plants
```

The Vitest setup registers the manifest and feature bindings before it runs a
test. At this point registration fails because the new leaf has no binding. This
is expected. Continue to step 2. Once registration can finish, the set's model
tests can also report a duplicate UUID, duplicate name, invalid `within` chain
or missing gate dependency.

## 2. Bind the field to canonical persistence

Add the field to the owning feature's `evaluation.js`.

- Use `scalar({ field, obligation })` for a top-level field.
- Use `grouped({ field, obligation, groups })` with the full group path for a
  collection member.
- Add `convert` only when canonical fulfilment needs a different value from the
  cleaned page value.

Import the obligation object **from the manifest**. A structurally identical
copy is rejected: the registry checks object identity, not shape.

If this is the feature's first binding file, import its `evaluationBindings` in
[`journeys/linear/features/evaluation.js`](../journeys/linear/features/evaluation.js)
and add it to `featureEvaluationBindings`. That barrel currently exports a
frozen empty array.

Run `npm run test:high-risk-plants` again. The fulfilment-registry error should
be gone. Tests that build dispatch now report the new obligation as collected by
no page. Step 3 satisfies that check.

## 3. Collect, validate and save the field

Add the obligation name to the owning controller's `meta.collects`. A page that
owns a repeatable collection still names only the root group.

Keep the controller in this order:

1. GET calls `state.get()` once and prefills the field from `answers`.
2. POST reads raw values from `request.payload`.
3. POST validates with the factories from
   [`src/server/app/lib/validate/index.js`](../../../lib/validate/index.js).
4. An invalid POST renders the user's raw values and returns 400.
5. A valid POST commits the cleaned values with `state.commit()`.
6. The redirect uses `await kit.nextTarget(request, page, committed.scope)`.

Persist `value` from the validation result, not the raw payload — normalising
validators return cleaned values, and the guarantee is pinned by
[`src/server/app/lib/validate/persists-cleaned-value.test.js`](../../../lib/validate/persists-cleaned-value.test.js).

Build service-backed membership rules inside POST, or through a function that
POST calls. This uses the values primed at boot. Do not freeze a service list in
a module-level schema.

For a conditional field, use `scope.has(fieldName)` to decide whether to render
and validate it. Do not commit a hidden value. The evaluator removes stored data
when the obligation leaves scope.

Wrap the write in `kit.recoverableSave()`. On a marked persistence failure,
render the same values with `recoverableError: true` and return 500. Let other
errors throw.

Run `npm run test:high-risk-plants`. `buildDispatch` should now pass. Update the
existing case for this controller in `src/server/app/contract.test.js`: add the
field to the valid payload and seed any answer that puts it in scope. The test
expects a valid POST to commit exactly the committable names in `meta.collects`.

The contract cases are a manual list. A new field on a listed controller often
makes its case fail. A controller that is not listed is not detected
automatically, so add a case rather than relying on a red test.

Run `npm test` after updating the case. `npm run test:high-risk-plants` does not
run this L1 contract test.

## 4. Add copy and markup

Add English and Welsh copy to the feature's `copy/copy.en.js` and
`copy/copy.cy.js`. Keep the same leaf paths and the same value kinds in both
files. Resolve the bundle with `copyFor({ en, cy })` in the controller.

Render the field with a GOV.UK or MoJ macro in the feature's `.njk` template.
Keep the input name, input id and validation error key the same. This lets the
error-summary link target `#<fieldName>` and move focus to the control.

Update the feature's `copy/copy.test.js`. The automatic convention checks are:

- [`src/server/app/copy-convention.test.js`](../../../copy-convention.test.js),
  which requires every feature with a template to own `copy/copy.en.js`,
  `copy/copy.cy.js` and `copy/copy.test.js`, and requires valid copy leaves
- [`src/server/app/copy-parity.test.js`](../../../copy-parity.test.js), which
  requires English and Welsh bundles to have the same shape

For a field in an existing feature, parity is normally the first copy check to
fail when only one locale changes. Add both locale leaves and update the local
copy test.

## 5. Add the check-answers row

Add the row to the matching card under the check-answers feature's view model.
Add its label and any displayed value labels to both check-answers copy bundles.

Use `row()` for an editable scalar. Pass the obligation name so `changeAction()`
resolves the owning page through the dispatch index. Use a service label function
when the stored value is a code. Show a conditional row only while the same
obligation path is in scope.

Extend the check-answers feature spec to cover the displayed value and its
Change link.

Follow
[`journeys/linear/features/check-answers/view-model/`](../journeys/linear/features/check-answers/view-model/):
`index.js` builds the cards, filters conditional rows with `scope.has()` and
resolves coded values with `countries.originLabel()` and `ports.label()`.
[`rows/summary-row.js`](../journeys/linear/features/check-answers/view-model/rows/summary-row.js)
provides `row()`, and
[`rows/change-link.js`](../journeys/linear/features/check-answers/view-model/rows/change-link.js)
provides the dispatch-backed `changeAction()`.
Use both
[`copy/copy.en.js`](../journeys/linear/features/check-answers/copy/copy.en.js)
and [`copy/copy.cy.js`](../journeys/linear/features/check-answers/copy/copy.cy.js)
for labels. Extend
[`check-answers.fit.spec.js`](../journeys/linear/features/check-answers/check-answers.fit.spec.js)
for saved values, scoped output and Change navigation back to review.

## 6. Update downstream persistence when the backend needs the field

The feature binding is always required. The notification mapper is required only
when the backend notification projection has a home for the field.

If it does, update the matching module under
[`src/server/app/services/persistence/records/notification-mapper/`](../../../services/persistence/records/notification-mapper/index.js)
and add a test beside it — the mapper has no test file yet, so the first
mapper field to be added creates `notification-mapper.test.js`.

This repository ships one mapper, and no outbox.

If the backend has no field home, leave the mapper unchanged and add or update
an explicit omission assertion. Do not invent a payload property.

## 7. Register client JavaScript when the field needs it

Prefer server-rendered controls. If the page needs a new client bundle:

1. Put its entry module under the feature, as
   `journeys/linear/features/<feature>/client/index.js`.
2. Add a named `entry` in the repo-root `webpack.config.js`.
3. Load that entry from the template with `getAssetPath('<entry>.js')`.

Without the webpack entry, the template still renders but the bundle returns a 404. The failure is easy to miss: nothing logs it and the page looks correct
until the behaviour is tried.

## 8. Add or extend unit tests

Extend the feature's `controller.test.js`. Cover:

- GET prefill
- every validation branch
- raw input on a 400 response
- cleaned input on a successful commit
- conditional render, validation and purge when relevant
- the marked recoverable-save failure and the 500 response
- unexpected errors still throwing

Add focused model, gate, mapper and check-answers tests when the field changes
those contracts.

## Playwright feature test

Keep the spec with the feature. Extend its existing `*.fit.spec.js`. A small
single-page feature keeps the spec at the feature root
(`journeys/linear/features/<feature>/<feature>.fit.spec.js`); a multi-page
feature uses `journeys/linear/features/<group>/fit/<page>.fit.spec.js`.

Keep each test independent. Start a new notification for each test. Do not use
page objects. Use raw Playwright role, label and visible-copy locators. Use
Playwright assertions and locator auto-waiting. Use `expect.poll` for state that
has no locator assertion. Do not add sleeps.

Cover:

- the field's initial render, label, hint and options
- a happy-path save, redirect, reload and persisted value
- each validation rule in its own test
- the raw entered value and the other entered values on error
- the error-summary link moving focus to the field
- conditional show, hide and persisted-value purge when relevant
- the check-answers value and Change link

## Accessibility test

Add an axe test for both page states the field changes:

- initial render
- validation error state, after the inline error and error summary appear

Use `AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa'])` and fail when any
violation has `impact` equal to `serious` or `critical`.

> **EXEMPLAR PLACEHOLDER** — the initial-state and error-state axe pattern
> should be established by the first feature spec that covers a validated field
> and cited here once it exists. Filter a known component false positive only
> when that exemplar does and the same markup proves it applies.

## 9. Run every check

```bash
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run lint
```

Green means every command exits with code 0, Vitest reports no failed tests,
Playwright reports no failed specs, and lint reports no errors. Check the page in
both initial and error states before finishing.
