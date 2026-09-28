# Move a page

## When to use it

Use this recipe to change where a page sits in the journey. For example:

- "Ask for the consignor before the place of destination."
- "Move identification numbers so it comes straight after the commodities."

Do not use it to show a page only to some people (use
[add-a-branch](add-a-branch.md)), or to regroup the task list without moving
any pages (use [task-list](task-list.md)).

## Four orders, not one

A page's position shows up in four places. People notice all four, so a move
usually changes all four:

1. **The first pass.** Someone starting a new notification is walked through
   the pages in the order of `RUN_STEPS` in `flow/run.js`.
2. **Continue, after the first pass.** Coming back from the task list,
   Continue goes to the next page in the same section of `flow/flow.js`, then
   back to the task list.
3. **The task list.** The order of tasks comes from `GROUPS` in
   `features/hub/controller.js`, and which pages belong to a task comes from
   `flow/task-rows.js`.
4. **Check your answers.** The order of cards and rows comes from
   `features/check-answers/view-model/index.js`.

By default, change all four so they agree. If the designer asks for only one
("just change the order they're asked in"), change only that one and say which
orders now disagree.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `<journey>/flow/run.js`
- `<journey>/flow/flow.js`
- `<journey>/flow/task-rows.js`
- `<journey>/features/hub/controller.js`
- `<journey>/flow/section-captions/index.js` (only if the caption should
  change)
- `<journey>/features/check-answers/view-model/index.js`
- `<journey>/flow/fixtures/happy-path.json`

`.claude/skills/change-the-journey/references/page-id-places.md` lists every
place a page is named, and every page in the journey today with its id, slug,
section, task row and caption.

## Worked example

"Ask for the consignor before the place of destination."

In the journey today, place of destination (`destinations/select`) comes
before the consignor (`consignors/select`). This move swaps them.

To move them the other way, follow the same steps with the two pages swapped.
If a page is already where the designer wants it, say so and change nothing.

## Steps

### 0. See where the pages are now

```bash
npm run designer:release -- orders <release> <page> <page>
```

Name the pages by address, for example
`npm run designer:release -- orders plants-working destinations/select consignors/select`.
It prints the first pass, the Continue sections and the task list, with the
named pages marked, and says which number each is in the first pass. If the
pages are already in the order the designer asked for in all of them, say so,
show them the printed orders, and change nothing: that is the whole run. If
only some orders differ, say which, and change only those.

### 1. Find every place the page is named

Search the release with the Grep tool for the page's export name
(`consignorPage`), its id (`'consignor-select'`) and its slug
(`consignors/select`). Write down each file that matches. You will visit each
one below.

### 2. Check what the page reads from earlier pages

Search the moving page's controller for `answers[`. If it reads an answer from
a page it will now come before, it will show its fallback wording. For
example, `place-of-destination` reads `arrivalStatus`. Tell the designer what
they will see, before you move it.

Two moves are never safe in a release:

- Never move a page before `commodity-type`. It is the entry page: every new
  notification starts there, and the start button and the entry guard point at
  it.
- Never move a page into the `review` section (check your answers,
  declaration, confirmation).

Moving a page before `origin` means it can open before a country is chosen.
That only matters if the page uses the country.

### 3. Change the first pass

In `flow/run.js`, move the page's step in `RUN_STEPS`. For the example, move
the consignor step above the place-of-destination step:

```js
  { id: arrivalDetailsPage.id, target: flowPageTarget(arrivalDetailsPage) },
  { id: consignorPage.id, target: flowPageTarget(consignorPage) },
  {
    id: placeOfDestinationPage.id,
    target: flowPageTarget(placeOfDestinationPage)
  },
  {
    id: identificationNumbersPage.id,
    target: flowPageTarget(identificationNumbersPage)
  },
```

Update the comment above `RUN_STEPS` so it describes the new order.

### 4. Change the Continue order

In `flow/flow.js`, move the page within `sections`. Continue only follows
pages in the same section, so put the moved page in the same section as the
page it should lead to. For the example, move `consignorPage` out of the
`parties` section and in front of the destination page:

```js
  { id: 'destination', pages: [consignorPage, placeOfDestinationPage] },
  { id: 'parties', pages: [identificationNumbersPage] },
```

Rules for sections:

- Array order is journey order.
- A page opened from another page, rather than by Continue, keeps a section of
  its own (like `commodityDetails`).
- Never rename or move the `review` section: the task list looks it up by
  name.
- A section left with no pages must be removed.

Update the comment above `sections` so it describes the new order.

### 5. Change the task list

If the page's task should appear in a different place on the task list:

- In `features/hub/controller.js`, move the task row's id within `GROUPS`.
  For the example, move `'consignor'` from the `consignment-parties` group to
  the `arrival-and-destination` group, before `'destination'`:

```js
  { id: 'arrival-and-destination', rows: ['arrival', 'consignor', 'destination'] },
  { id: 'consignment-parties', rows: ['identificationNumbers', 'contact'] },
```

- If the page should join another task, move it between rows in
  `flow/task-rows.js`. The page asked first must lead its row, because the task
  list links to the first page in the row that applies.
- If a group's heading no longer describes its tasks, follow
  [task-list](task-list.md) to rename it.

### 6. Decide the caption

The caption above the page heading comes from `flow/section-captions/index.js`.
It names what the page is about, not where it sits, so a move usually leaves it
alone. If the designer wants it changed, move the page to another entry in
`captionSections`.

### 7. Change check your answers

Keep check your answers in the same order as the journey. In
`features/check-answers/view-model/index.js`, move the card or row. For the
example, the consignor card moves from `partiesSection` to `arrivalSection`,
before the place-of-destination card. Both sections build the card with
`partyCard`; `arrivalSection` will need `scope` from the context to keep the
`scope.has('consignor')` check. [check-answers](check-answers.md) explains the
file.

Change links find the page that collects each answer by themselves. A move
never needs a Change link edited.

### 8. Reorder the example data

In `flow/fixtures/happy-path.json`, move the page's step in every scenario so
the steps follow the new order. For the example, in `plantsForPlanting` and
`woodWithoutBark`, move the `consignors/select` step above the
`destinations/select` step. Potato scenarios have no consignor step.

## What you will see

- Start a new notification of plants for planting. After arrival details, the
  consignor page comes next, then the place of destination.
- The task list shows "Consignor or exporter" in group 2, above "Place of
  destination".
- Check your answers shows the consignor card above the place of destination.
- A potato notification is unchanged: it never asks for a consignor.

## How to check it

1. `npm run designer:examples -- check <release>`
2. `npm run designer:check -- --set <release> --walk`. It runs the full check
   first, so there is no separate `--full` run. The walk follows the first
   pass to the confirmation page, so a page in the wrong place, or a step the
   example data no longer reaches, fails here.
3. `npm run designer:release -- orders <release> <page>` again: the orders
   now read the way the designer asked.
4. `npm run designer:show -- --set <release> --pages all --before`. The
   gallery shows the pages in journey order, before and after. Read it and
   confirm the new order.
5. Tell the designer which of the four orders changed, and give the link to a
   draft example so they can walk it themselves.

## Hand-off notes

- The brief lists the four orders and which ones changed.
- The real team's tests pin today's order (the run, flow, task-row and hub
  tests). The brief lists them as tests the move will break.
- Record the recipe as `move-a-page` in the commit message.
