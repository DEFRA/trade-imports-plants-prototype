# Which recipe to follow

Pick one recipe per request. Read it from start to finish before you edit
anything. Then follow it step by step, changing as little as you can.

Two kinds of recipe exist:

- **Real-service recipes.** The plants team wrote these for the real journey.
  They live in `src/server/app/sets/high-risk-plants/docs/`. A design release
  does not carry a `docs/` folder, so always read them from high-risk-plants.
  Never edit them: they belong to the real service.
- **Designer recipes.** These live in `docs/designers/recipes/`. They cover the
  changes designers make most often that the real-service recipes do not.

In this file, `<release>` means the id of the designer's release (for example
`plants-working`), and "the journey folder" means
`src/server/app/sets/<release>/journeys/linear/`.

## Route by what the designer asked for

Match the request to the first line that fits.

1. "Add a question", "add a field", "ask for X on the Y page": the real-service
   recipe **add-a-field** (`src/server/app/sets/high-risk-plants/docs/add-a-field.md`).
   If the question decides whether a later page shows, use **add-a-branch**
   instead: it includes the question.
2. "Only show this page when", "skip this page if", "if they answer yes, ask":
   the designer recipe **add-a-branch** (`docs/designers/recipes/add-a-branch.md`).
3. "Add a guidance page", "add an information page", "add an interruption
   page", "a page that explains something before the next question": the
   designer recipe **guidance-page** (`docs/designers/recipes/guidance-page.md`).
4. "Add a page" that asks at least one question: the real-service recipe
   **add-a-page** (`src/server/app/sets/high-risk-plants/docs/add-a-page.md`).
5. "Add a new task to the task list with its own pages", "add a section": the
   real-service recipe **add-a-section**
   (`src/server/app/sets/high-risk-plants/docs/add-a-section.md`).
6. "Add a list of things", "add another", "let them add more than one X": the
   real-service recipe **add-a-collection**
   (`src/server/app/sets/high-risk-plants/docs/add-a-collection.md`). This is
   the largest recipe. Tell the designer it is the largest change this skill
   makes, and do it only in a working release.
7. "Move this page", "ask X before Y", "change the order of the pages": the
   designer recipe **move-a-page** (`docs/designers/recipes/move-a-page.md`).
8. "Regroup the task list", "rename a task list group", "move a task to another
   group", "rename a task": the designer recipe **task-list**
   (`docs/designers/recipes/task-list.md`).
9. "Reorder check your answers", "rename a check your answers heading or
   card", "add or remove a row on check your answers": the designer recipe
   **check-answers** (`docs/designers/recipes/check-answers.md`).
10. "Change the confirmation page", "add a what happens next section", "show a
    different confirmation for X": the designer recipe **confirmation-variant**
    (`docs/designers/recipes/confirmation-variant.md`).
11. "Make this question optional", "make this question required", "add a rule
    that X must be Y", "change what counts as a valid answer": the designer
    recipe **validation-rules** (`docs/designers/recipes/validation-rules.md`).

If the request only changes words (a heading, label, hint, button or error
message that already exists), stop and use `change-the-words`. If it only
changes how a page looks, use `match-the-design`. If it is about a dashboard,
the address book, saved transporters or templates, use `fake-a-service`. If it
is about letting research participants past errors, use `research-session`.

If a request mixes several of these ("add a question and move the page"), do
the first one, finish it, and list the rest for the designer to ask for next.

When the obligation model is involved (a new field, a branch, a list), also
read `src/server/app/sets/high-risk-plants/docs/obligation-model.md` and the
platform guide `src/server/app/docs/validation.md`. For any change to the page
order, also read `src/server/app/sets/high-risk-plants/docs/journey-flow-and-gates.md`.

## Following a real-service recipe in a design release

The real-service recipes say "all other paths in this recipe are relative to
`src/server/app/sets/high-risk-plants/`". In a release, read that as
`src/server/app/sets/<release>/`. Links to `../../../docs/` still point at the
shared platform guides in `src/server/app/docs/`.

Other names to swap:

- The set's gateway is `src/server/app/routes-<release>.js`, not
  `routes-high-risk-plants.js`. You almost never need to edit it: it takes the
  whole exported arrays from `flow.js`, `task-rows.js` and `features/index.js`.
- `TEMPLATES` in the journey folder's `config.js` is
  `'<release>/journeys/linear'`. Import it; never type the prefix by hand.
- `npm run test:high-risk-plants` does not cover a release. Use
  `npm run designer:check -- --set <release>` wherever a recipe says to run it.

### Steps to skip in a release

A release carries no tests of its own, so skip every step that creates or
edits a test:

- any `controller.test.js`, `copy/copy.test.js`, `task-rows.test.js`,
  `section-captions.test.js` or `*.test.js` of any kind
- any `*.fit.spec.js` (the "Playwright feature test" and "Accessibility test"
  sections)
- the step that edits `src/server/app/contract.test.js`: that file belongs to
  the real service and only lists high-risk-plants
- the step that adds a page to the `BARE` list "in that folder's test"; in a
  release, either add the page to a caption section or leave it out

Also skip these, because they change files the whole prototype shares:

- **Backend mapping** (add-a-field step 6, add-a-page step 7 second half,
  add-a-section step 8). The mapper under `src/server/app/services/` belongs
  to the real service. Note in your report that the field has no backend home
  yet; the hand-off brief carries it.
- **Client JavaScript** (add-a-field step 7, add-a-page step 8, add-a-section
  step 9). `webpack.config.js` and `src/client/` belong to the real service.
  Use a server-rendered GOV.UK component instead. If the design truly needs
  script, record it as a design gap (`match-the-design` explains how) and stop.

Do not skip anything else. The boot guards still apply in a release: the
prototype refuses to start if an obligation has no page, no feature binding,
or carries display words. `references/errors-explained.md` maps each refusal to
the step you missed.

### When a required question changes

If the change adds a required question, makes a question required, or changes
which values a question accepts, the release's example data will stop at that
page. Update `src/server/app/sets/<release>/journeys/linear/flow/fixtures/happy-path.json`:

- give every scenario that reaches the page a valid answer for the new field,
  in the `fields` of that page's step (the key is the field name)
- add a step for any new page, in journey order, with its `slug` and `fields`

Then run `npm run designer:examples -- check <release>`. Every example must say
it was reached.

### Where the real-service recipes are out of date

The recipes were written as the journey grew, and some counts have not caught
up. Trust the code over the recipe when they disagree:

- **add-a-page** says the hub renders four rows and that two task-list groups
  are empty. Today every group is filled: seven task rows plus the review row
  across four groups. It says `RUN_STEPS` holds six steps; it holds nine
  (consignor, identification numbers and contact follow place of destination).
  It says the registration modules exist "empty"; they are full.
- **journey-flow-and-gates** lists the sections and task rows only up to
  destination. `flow.js` also has `parties`, `contact` and `review`, and
  `task-rows.js` also has `consignor`, `identificationNumbers` and `contact`.
  It says `FLOW_ONLY_KEYS` is empty; it holds `declaration`. It says four
  caption sections exist; there are five (the fifth is `consignmentParties`).
- **add-a-field** says the `obligations/sections/` folder "does not exist yet"
  and the evaluation barrel "exports a frozen empty array". Both exist and are
  full.
- **testing.md** says the set "owns no test files". High-risk-plants has many.
  A release has none, by design.

Read the file the recipe names, not the count it quotes.

## Hand-off mode

On a `handoff/<slug>` branch, and only there, the target set is
`high-risk-plants` and nothing is skipped:

- follow the real-service recipe in full, including its tests, the contract
  case, the check-answers feature spec and the axe checks
- for a designer recipe, do its steps, then add the tests the nearest
  real-service recipe asks for (a new page: add-a-page steps 9 onwards; a flow
  or task-row change: the flow, task-row and hub tests it names)
- run the ladder from `src/server/app/sets/high-risk-plants/docs/testing.md`,
  one command at a time: `npm run test:high-risk-plants`, `npm test`,
  `npm run test:fit:features`, `npm run lint`, and `npm run test:fit:journeys`
  for any change to page order or the happy path

`npm run test:fit:features` uses port 3003 by default, which does not clash
with the prototype on 3103. Do not add a `PORT=` prefix.
