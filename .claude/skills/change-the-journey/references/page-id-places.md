# Every place a page is named

A page has three names, and different files use different ones:

- its **export name**, like `placeOfDestinationPage`, which other files import
- its **id**, like `'place-of-destination'`, which the flow uses
- its **slug**, like `'destinations/select'`, which is the end of its web
  address

All three live in the feature's `page.js`. The feature folder name
(`place-of-destination/`) and the field it collects (`placeOfDestination`) are
two more names you will meet.

Before you move, rename or remove a page, search the release for all of them
with the Grep tool, in `src/server/app/sets/<release>/`:

1. the export name, for example `placeOfDestinationPage`
2. the id in quotes, for example `'place-of-destination'`
3. the slug, for example `destinations/select`

Every match is in one of the places below. Visit each one and decide whether
the change touches it. Say which ones you changed and which you left alone,
and why.

In this file "the journey folder" means
`src/server/app/sets/<release>/journeys/linear/`.

## The places, in the order to check them

1. **The page's identity**: `features/<feature>/page.js`. It exports
   `{ id, slug }` and imports nothing. Keep it that way: importing anything
   here can make a loop of imports.
2. **The page's controller**: `features/<feature>/controller.js`. It builds
   `meta` from the identity, passes `page` to `kit.base()` (which is how the
   caption above the heading is found) and to `kit.nextTarget()` (which is how
   Continue finds the next page).
3. **The feature register**: `features/index.js`. The controller's `meta` goes
   in `dispatchPages` and its `routes` go in `allRoutes`. A page missing from
   `dispatchPages` has no place in the flow; a page missing from `allRoutes`
   answers "page not found".
4. **The binding register**: `features/evaluation.js`. This names features,
   not pages. Only a page that collects answers needs an entry.
5. **The page order**: `flow/flow.js`, the `sections` array. After the first
   pass through the journey, Continue goes to the next page in the same
   section, then back to the task list. Its position also decides which earlier
   answers must exist before the page opens.
6. **The first pass**: `flow/run.js`, the `RUN_STEPS` array. When someone
   starts a new notification, they are walked through these steps in this
   order. A step whose page does not apply is skipped.
7. **The task list rows**: `flow/task-rows.js`, the `taskRows` array. This
   says which task on the task list a page belongs to. The task list links a
   task to the first page in its row that applies, so the question asked first
   must lead the row.
8. **The task list groups**: `features/hub/controller.js`, the `GROUPS` array.
   This names task rows, not pages. It only changes when a row moves group.
   The group headings and task names are in `features/hub/copy/copy.en.js` and
   `copy.cy.js`.
9. **The caption above the heading**: `flow/section-captions/index.js`, the
   `captionSections` array. A page left out shows no caption. The caption
   words are in `flow/section-captions/copy/copy.en.js` and `copy.cy.js`.
10. **Check your answers**: `features/check-answers/view-model/index.js`. This
    names fields, not pages. Change links find the page that collects a field
    by themselves, so a move never needs a link changed. A move may still mean
    a card should move to another section of check your answers.
11. **Links written by hand**: a controller that sends people to another page
    by its slug. Today these are the commodities list and details pages
    (`features/commodities/links.js`), declaration to confirmation,
    confirmation and cancel-amend back to check your answers
    (`kit.CYA_SLUG`, which is `'notification-view'`), and the dashboard's
    start button, which goes to `commodity-type`.
12. **The entry page**: `flow/entry-guard.js`. A new notification must start on
    `commodity-type`. Anyone who opens a later page of a notification they
    never started is sent back there. Only a change to the first page touches
    this.
13. **The example data**: `flow/fixtures/happy-path.json`. Each scenario lists
    `steps`, each with a `slug` and the `fields` to fill in. Keep the steps in
    journey order.
14. **Named examples**, if the release has any, under
    `src/server/prototype-seed/`. An example that stops at a page names it by
    slug. `example-data` owns these; tell the designer if one names the page
    you changed.

## Answers a page reads from earlier pages

Some pages change what they ask based on an earlier answer. Moving them ahead
of that answer changes what people see:

- `arrival-details` reads `arrivalStatus` to choose its date question.
- `place-of-destination` reads `arrivalStatus` to choose its heading. With no
  answer it falls back to the "not arrived yet" wording.
- `check-answers` reads every answer.

Search a page's controller for `answers[` to find what it reads.

## The pages in the journey today

This is the high-risk-plants journey that releases are copied from. A release
made earlier may differ: read its files, not this list.

- **dashboard**: export `dashboardPage`, slug is empty. Section `start`.
  Caption `dashboard`. No task row.
- **commodity-type**: export `commodityTypePage`, slug `commodity-type`.
  Section `commodity`. First pass step 1. Task row `commodities`, group
  `about-the-consignment`. Caption `aboutTheConsignment`. The entry page.
- **commodities**: export `commoditiesPage`, slug `commodities`. Section
  `commodity`. First pass step 2. Task row `commodities`. Caption
  `aboutTheConsignment`.
- **commodity-details**: export `commodityDetailsPage`, slug
  `commodities/details`. Section `commodityDetails` (its own, because it is
  opened from the list, not by Continue). Not a first pass step. Task row
  `commodities`. Caption `aboutTheConsignment`.
- **origin**: export `originPage`, slug `origin`. Section `origin`. First pass
  step 3. Task row `origin`, group `about-the-consignment`. Caption
  `aboutTheConsignment`.
- **arrival-status**: export `arrivalStatusPage`, slug `arrival-status`.
  Section `arrival`. First pass step 4, skipped for potatoes. Task row
  `arrival`, group `arrival-and-destination`. Caption `arrival`.
- **arrival-details**: export `arrivalDetailsPage`, slug `arrival-details`.
  Section `arrival`. First pass step 5. Task row `arrival`. Caption `arrival`.
- **place-of-destination**: export `placeOfDestinationPage`, slug
  `destinations/select`, feature folder `place-of-destination`. Section
  `destination`. First pass step 6. Task row `destination`, group
  `arrival-and-destination`. Caption `destination`. Check your answers: a card
  in the arrival section.
- **consignor-select**: export `consignorPage`, slug `consignors/select`.
  Section `parties`. First pass step 7, skipped for potatoes. Task row
  `consignor` (hidden when it does not apply), group `consignment-parties`.
  Caption `consignmentParties`. Check your answers: a card in the parties
  section.
- **identification-numbers**: export `identificationNumbersPage`, slug
  `identification-numbers`. Section `parties`. First pass step 8. Task row
  `identificationNumbers`, group `consignment-parties`. Caption
  `consignmentParties`.
- **consignment-contact-select**: export `consignmentContactSelectPage`, slug
  `consignment/contact/select`. Section `contact`. First pass step 9. Task row
  `contact`, group `consignment-parties`. No caption.
- **notification-view** (check your answers): export `notificationViewPage`,
  slug `notification-view`. Section `review`, which opens only when every task
  is ready. Reached from the `review` row, group `check-and-submit`. No
  caption.
- **declaration**: export `declarationPage`, slug `declaration`. Section
  `review`. No caption.
- **confirmation**: export `confirmationPage`, slug `confirmation`. Section
  `review`. No caption. Only shown once the notification is submitted.
