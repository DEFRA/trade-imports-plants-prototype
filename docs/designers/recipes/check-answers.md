# Change check your answers

This recipe mirrors §5 ("Add the check-answers row") of the real
plants-frontend's own
`src/server/app/sets/high-risk-plants/docs/add-a-field.md`, which documents
the same view model, rows and copy this recipe changes.

## When to use it

Use this recipe to change what the check your answers page shows, or in what
order. For example:

- "Put the arrival card above the commodities."
- "Show the place of landing before the arrival time."
- "Drop the Import details card title."
- "Add a row for the new question."
- "Only show the consignment number when there is one."

To change only the words of a heading, card title or row label, use
`change-the-words`. To change how the page looks (a different component, not
a summary list), use `match-the-design`.

## How the page is built

The page is a list of **sections**, each with a heading. Each section holds
**cards** (GOV.UK summary cards). Each card holds **rows**: a label, the
answer, and a Change link.

The page id is `notification-view`. Its template
(`features/check-answers/template.njk`) draws every section, card and row the
same way. Almost every change is in the view model instead.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `<journey>/features/check-answers/view-model/index.js`: which sections,
  cards and rows, in which order. `buildSections` at the bottom sets the
  section order.
- `<journey>/features/check-answers/copy/copy.en.js` and `copy.cy.js`:
  `sections` (headings), `cards` (card titles), `labels` (row labels, keyed by
  field name), and the lists that turn a stored code into words
  (`typeLabels`, `statusLabels`, `categoryLabels`, `genusLabels`)
- `<journey>/features/check-answers/view-model/rows/summary-row.js`: `row()`
  (a row with a Change link) and `readOnlyRow()` (a row without one)

## The helpers in the view model

Each section builder receives a context with these helpers:

- `answerRow(field, value)`: a row labelled `copy.labels[field]`, showing
  `value` (or the stored answer if you pass no value), with a Change link to
  the page that asks that field. Pass words, not codes: for a coded answer,
  look the words up, like `copy.typeLabels[answers.commodityType]`.
- `scopedRows([field, ...])`: a row for each field that applies to this
  notification, in the order you list them. A field that does not apply
  (a branch not taken) gets no row.
- `row(journeyId, readOnly, label, value, field)`: like `answerRow`, but with
  your own label. The arrival date uses it, because its label changes with the
  arrival status.
- `partyCard(field, title, party, journeyId, readOnly)`: a whole card for an
  address picked from the address book.

Change links find the page that asks each field by themselves. You never write
a Change link's address. A submitted notification shows no Change links: the
`readOnly` flag handles that.

## Steps

### Reorder sections

In `buildSections`, change the order of the three calls:

```js
return [
  arrivalSection(context),
  consignmentSection(context),
  partiesSection(context)
]
```

The headings carry numbers ("1. About the consignment"). Renumber them in
both copy files under `sections` to match.

### Reorder cards or rows

Move the card within its section's `cards` array, or the row within its
card's `rows` array. For example, in `arrivalRows`, move
`...scopedRows(['arrivalTime'])` below the place-of-landing row.

To move a card to another section, cut it from one section builder and paste
it into another. Add anything it uses (such as `scope` or `parties`) to the
receiving builder's list of context values at the top.

### Rename a heading, card title or row label

Change the words in `copy/copy.en.js` under `sections`, `cards` or `labels`,
and the same key in `copy/copy.cy.js`. If the designer gave no Welsh, write
`'[Welsh needed] <the new English>'`.

To drop a card title, keep the key and ask the designer what the card should
be called instead: GOV.UK summary cards need a title.

### Add a row for a new question

1. Add a label under `labels.<fieldName>` in both copy files.
2. In the right section builder, add `answerRow('<fieldName>')` for a question
   that always applies, or add the field to a `scopedRows([...])` list for one
   that sometimes applies. If the builder does not list `answerRow` or
   `scopedRows` in the context values at its top, add it there.
3. For a coded answer (radios, a select), add a word list to both copy files,
   such as `yesNoLabels: { yes: 'Yes', no: 'No' }`, and pass
   `copy.yesNoLabels[answers.<fieldName>]` as the value.

### Show a row only when there is an answer

`scopedRows` already hides a question that does not apply. To hide an
optional question that applies but was left blank, filter it in the builder:
`...(answers.consignmentNumber ? [answerRow('consignmentNumber')] : [])`.
Take it out of any `scopedRows` list first, or it shows twice. Today the
consignment number is in the `IDENTIFIERS` list near the top of the file.

### Remove a row or card

Delete it from the builder. Leave its label in the copy files: an unused copy
key does no harm, and the real team may still need it.

## What you will see

Open check your answers on a draft example. The sections, cards and rows show
in the new order with the new words. On a submitted example, the same page
shows without Change links.

## How to check it

1. `npm run designer:check -- --set <release> --full`
2. `npm run designer:show -- --set <release> --pages notification-view`. Read
   the screenshot. If the change affects a branch, check both examples
   (with and without the branch).
3. Give the designer the link to a draft example and to a submitted one.

## Hand-off notes

- The real team's check-answers tests pin the order and labels. The brief
  lists them.
- Record the recipe as `check-answers` in the commit message.
