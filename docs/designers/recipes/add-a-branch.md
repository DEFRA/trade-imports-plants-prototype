# Show a page only when an answer says so (add a branch)

## When to use it

Use this recipe when a page should only appear for some people, depending on
an earlier answer. For example:

- "If they answer Yes, ask how many vehicles."
- "Skip the consignor page for potatoes."
- "Only show this page when the consignment has already arrived."

The earlier answer is called the **gate question**. The page that appears or
not is called the **branch page**.

Do not use it to change the order of pages (use
[move-a-page](move-a-page.md)) or to change what counts as a valid answer (use
[validation-rules](validation-rules.md)).

## How a branch works here

You never write "if Yes, go to page X". Instead, the branch page's question
says when it applies. The prototype then does the rest:

- When the gate answer does not match, the branch page is skipped: Continue,
  the first pass through the journey and the task list all pass over it.
- If someone changes the gate answer later, the branch page's answer is
  cleared, so check your answers never shows a stale answer.
- Check your answers hides the row, and the answer does not count towards
  "ready to submit".

This is the same mechanism the real journey uses. `obligations/sections/arrival.js`
asks the arrival-status question only for plants and wood, and asks the
arrival time only for potatoes. Read that file first: it is the model to copy.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `src/server/app/sets/<release>/obligations/sections/<section>.js`: the gate
  question and the branch question
- `src/server/app/sets/<release>/obligations/index.js`: exports them
- `<journey>/features/<feature>/evaluation.js` and
  `<journey>/features/evaluation.js`: where each answer is stored
- the feature folders of the gate page and the branch page
- `<journey>/features/index.js`: registers a new page
- `<journey>/flow/flow.js`, `<journey>/flow/run.js`,
  `<journey>/flow/task-rows.js`, `<journey>/flow/section-captions/index.js`:
  where a new branch page sits
- `<journey>/features/check-answers/view-model/index.js` and
  `<journey>/features/check-answers/copy/`: the rows on check your answers
- `<journey>/flow/fixtures/happy-path.json`: the example data

## Worked example

"On arrival details, ask 'Is the consignment arriving in more than one
vehicle?'. If Yes, show a new page asking how many vehicles."

- Gate question: `moreThanOneVehicle`, Yes or No, added to the existing
  arrival-details page.
- Branch page: a new page `number-of-vehicles` collecting `numberOfVehicles`.

## Steps

Do these in order. Save nothing to the real journey (`high-risk-plants`).

### 1. Define both questions in the obligations file

Open `src/server/app/sets/<release>/obligations/sections/arrival.js` (pick the
file for the part of the journey the page is in). Add the gate question if it
is new, then the branch question with an `applyTo` gate:

```js
export const moreThanOneVehicle = {
  id: '<a new UUID>',
  name: 'moreThanOneVehicle',
  status: 'mandatory'
}

export const numberOfVehicles = {
  id: '<another new UUID>',
  name: 'numberOfVehicles',
  status: 'mandatory',
  applyTo: equalsGate(
    moreThanOneVehicle,
    'yes',
    { inScope: true, status: 'mandatory' },
    { inScope: false }
  )
}
```

Rules:

- **New ids.** Each `id` is a new random UUID (version 4). Search the release
  for it with the Grep tool before you use it: it must not appear anywhere.
- **Names** are camel case with no `.`, `[` or `]`. The name is also the form
  field name and the key in the example data.
- **The gate value is a plain string** in this file, like `'yes'`. Never import
  it from the journey folder: the obligations folder must not import from
  journeys (lint rule `obligations-never-journeys`).
- **Several values** open the branch: use `includesGate` instead of
  `equalsGate`, with a list of values in place of `'yes'`, like
  `['a', 'b']`. Both are already imported at
  the top of `arrival.js`; in another file, import them from
  `'../../../../model/obligations/helpers/index.js'`.
- **Only look back.** A gate must depend on an answer given earlier in the
  journey, never on the page it hides.
- **No words for the screen.** No `label`, `title`, `hint` or `legend` here.
  The prototype refuses to start if you add one.

To gate an existing page instead ("skip the X page if"), add the `applyTo`
line to the obligation that page already collects. Skip to step 5.

### 2. Export them and store the answers

In `src/server/app/sets/<release>/obligations/index.js`, import both, add both
to the `export { ... }` list, and add both to the `obligations` array (the gate
question first).

Store each answer in the feature that asks it, with
`scalar({ field, obligation })`:

- the gate question in `<journey>/features/arrival-details/evaluation.js`
- the branch question in a new
  `<journey>/features/number-of-vehicles/evaluation.js`:

```js
import {
  feature,
  scalar
} from '../../../../../../bridge/fulfilment-bindings.js'
import { numberOfVehicles } from '../../../../obligations/index.js'

export const evaluationBindings = feature('number-of-vehicles', [
  scalar({ field: 'numberOfVehicles', obligation: numberOfVehicles })
])
```

Register the new feature's bindings in `<journey>/features/evaluation.js`:
import `evaluationBindings as numberOfVehicles` and add it to
`featureEvaluationBindings`.

### 3. Ask the gate question

If the gate question sits on an existing page, follow the real-service
recipe `src/server/app/sets/high-risk-plants/docs/add-a-field.md` steps 3 and 4
in the release, skipping its test steps. For arrival-details that means:

- add `MORE_THAN_ONE_VEHICLE = 'moreThanOneVehicle'` to `fields.js`
- add it to `collects` in `controller.js`
- add `requiredOneOf(MORE_THAN_ONE_VEHICLE, ['yes', 'no'], copy.errors.moreThanOneVehicle)`
  to the rules `fields()` composes
- add it to `valuesFrom()`, so it is shown back, validated and saved
- render it with `govukRadios` and the `govuk-radios--inline` class, which is
  the GOV.UK pattern for a Yes or No question. Keep the field `name`, the
  `id` and the error key the same
- add the legend, the Yes and No labels and the error message to
  `copy/copy.en.js`, and the same keys to `copy/copy.cy.js`

If the gate question needs its own page, follow
`src/server/app/sets/high-risk-plants/docs/add-a-page.md` for it first, in the
release and without its test steps. `features/arrival-status/` is a complete
Yes or No style page to copy.

### 4. Build the branch page

Follow `src/server/app/sets/high-risk-plants/docs/add-a-page.md` steps 1 to 6
in the release, without the test files. For `number-of-vehicles`:

- `page.js`: `export const numberOfVehiclesPage = { id: 'number-of-vehicles', slug: 'number-of-vehicles' }`
- `controller.js`: `meta = { ...page, collects: ['numberOfVehicles'] }`, and
  validate with `requiredIntegerInRange('numberOfVehicles', { min: 2, max: 99, messages: { required: ..., invalid: ... } })`
- `template.njk`: a `govukInput` with `inputmode: "numeric"` and the
  `govuk-input--width-2` class. The page is reached by Continue, not from the
  task list, so end it with
  `saveActions(hubHref, copy = sharedCopy.saveActions, showReturnControls = false)`
- `copy/copy.en.js` and `copy/copy.cy.js`

`features/arrival-status/controller.js` is the shortest complete controller to
copy.

### 5. Put the branch page in the journey

The branch page goes straight after the page with the gate question, in all
four places:

- `flow/flow.js`: in the same section, straight after the gate page:
  `{ id: 'arrival', pages: [arrivalStatusPage, arrivalDetailsPage, numberOfVehiclesPage] }`
- `flow/run.js`: a step straight after the gate page's step:
  `{ id: numberOfVehiclesPage.id, target: flowPageTarget(numberOfVehiclesPage) }`.
  `flowPageTarget` is what skips the step when the page does not apply.
- `flow/task-rows.js`: in the same row as the gate page
- `flow/section-captions/index.js`: in the same caption section, or leave it
  out for no caption

If the whole task can be skipped (every page in its row is gated), add
`conditional: true` to the row in `task-rows.js`, like the `consignor` row.
Without it, the task list shows the task as "Cannot start yet" instead of
hiding it.

For a page that asks nothing (a guidance page), there is no question to gate.
Instead, give its identity a gate in `page.js`:
`gate: (scope) => scope.has('numberOfVehicles')` shows it only when the
number-of-vehicles question applies.

### 6. Show both answers on check your answers

Follow [check-answers](check-answers.md). In
`<journey>/features/check-answers/view-model/index.js`, in `arrivalRows`:

- the gate question always applies, so use
  `answerRow('moreThanOneVehicle', copy.yesNoLabels[answers.moreThanOneVehicle])`
- the branch question sometimes applies, so use
  `...scopedRows(['numberOfVehicles'])`. `scopedRows` drops the row when the
  question does not apply

Add `labels.moreThanOneVehicle`, `labels.numberOfVehicles` and
`yesNoLabels: { yes: 'Yes', no: 'No' }` to both check-answers copy files.

### 7. Update the example data

The gate question is required, so every example that passes arrival-details
needs an answer. In `<journey>/flow/fixtures/happy-path.json`:

- add `"moreThanOneVehicle": "no"` to the `fields` of every `arrival-details`
  step, in every scenario
- add one new scenario that takes the other branch. Copy the
  `plantsForPlanting` scenario under a new name, such as
  `plantsForPlantingTwoVehicles`, set `"moreThanOneVehicle": "yes"`, and add a
  step straight after arrival-details:
  `{ "slug": "number-of-vehicles", "fields": { "numberOfVehicles": "2" } }`

Now the example data covers both branches, and `designer:show` screenshots the
branch page from the new scenario.

The release's ready-made examples (the ones with links on the chooser) are
built from the first four scenarios, and all of them answer No. Add a Yes
example in the same run, so the designer gets a link to each branch without
asking again. It is part of this change, not a separate one:

1. If `src/server/prototype-seed/scenarios/<release>.js` does not exist yet,
   run `npm run designer:examples -- init <release>`.
2. Add one example to its list:

   ```js
   {
     label: 'Draft, more than one vehicle',
     slug: 'draft-two-vehicles',
     fixture: 'plantsForPlantingTwoVehicles',
     through: 'number-of-vehicles'
   }
   ```

3. `npm run designer:examples -- check <release>` must say it was reached.

## What you will see

- On arrival details, a Yes or No question at the end of the page (for potatoes
  that is after the time and the place of landing).
- Answer No: Continue goes on as before. The number-of-vehicles page never
  shows.
- Answer Yes: Continue goes to "How many vehicles?". Check your answers shows
  both rows.
- Go back, change Yes to No: the number is cleared and its row disappears.

## How to check it

1. `npm run designer:check -- --set <release> --full`. The prototype must
   start: a missing step shows as one of the refusals in
   `.claude/skills/change-the-journey/references/errors-explained.md`.
2. `npm run designer:examples -- check <release>`. Every example must say it
   was reached.
3. `npm run designer:check -- --set <release> --walk`. This walks both
   scenarios to the confirmation page. It includes the full check, so you can
   skip step 1 when you run this one.
4. `npm run designer:show -- --set <release> --pages arrival-details,number-of-vehicles,notification-view --each-example --errors --before`.
   (`notification-view` is the id of the check your answers page.)
   `--each-example` takes arrival-details and check your answers once for
   every example, so the Yes and the No side sit side by side. Look at the
   gallery: the question, its error state, the branch page, and check your
   answers with and without the number of vehicles. If the gallery lists the
   branch page under "Pages no example reaches", step 7 is missing.
5. Give the designer the example links from
   `npm run designer:examples -- links <release>`: "Draft, part way through"
   takes the No branch and "Draft, more than one vehicle" the Yes branch.

### What no check proves: changing Yes to No

No automatic check changes an answer from Yes to No and looks at what is
left. The clearing comes from the `applyTo` gate in step 1, the same code the
real journey uses for arrival status, so it works when step 1 is right. To
prove it, check both of these yourself and tell the designer you did:

- the branch question's obligation has the `applyTo` gate naming the gate
  question and the value `'yes'`
- check your answers uses `scopedRows(['numberOfVehicles'])` (step 6), not
  `answerRow`

Then ask the designer to try it once in the browser: open the Yes example
link, change the answer to No on arrival details, Continue, and open check
your answers (`?page=notification-view` on the example link). The number of
vehicles row must be gone.

## Hand-off notes

- The new questions have no home in the real backend yet. The brief says so.
- A branch is a rule about the notification, not only a screen. The real team
  will check it against the regulations before building it.
- Record the recipe as `add-a-branch` in the commit message.
