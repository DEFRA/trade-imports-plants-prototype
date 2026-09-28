# Change the task list

## When to use it

The task list is the "Overview" page of a notification. In the code it is
called the **hub**. Use this recipe to:

- rename a group heading, like "2. Arrival and destination"
- rename a task, like "Place of destination"
- move a task to another group, or change the order of tasks
- add, merge or remove a group
- add or change the hint under a task

To move pages within the journey, use [move-a-page](move-a-page.md). To add a
new task with new pages, use the real-service recipe
`src/server/app/sets/high-risk-plants/docs/add-a-section.md`.

## Three things with similar names

The same words often appear in three places. Ask which one the designer means,
or change all three if they say "everywhere":

1. **Task list group headings**, like "3. Consignment parties". These are in
   the hub's copy, under `groups`.
2. **Check your answers section headings**, like "3. Consignment parties".
   These are in the check-answers copy, under `sections`. They mirror the
   groups, so a group rename usually wants the same rename here.
3. **Captions above page headings**, like "Consignment parties" (no number).
   These are in `flow/section-captions/copy/`. They are a different list,
   finer than the groups.

A rename that only changes words, in any of the three, belongs to
`change-the-words`, not this recipe: it finds every home of the words and
runs the quick check. Use this recipe only when the change also moves, adds
or removes tasks or groups. If the designer names a group that does not exist
exactly ("the Arrival group" when it is "2. Arrival and destination"), use
the nearest match and say which one you took.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `<journey>/features/hub/controller.js`: `GROUPS`, the groups in order, each
  naming its task rows in order
- `<journey>/features/hub/copy/copy.en.js` and `copy.cy.js`: `groups` (the
  headings, keyed by group id) and `rows` (each task's `title`, and an
  optional `hint`, keyed by task row id)
- `<journey>/flow/task-rows.js`: which pages make up each task
- `<journey>/features/check-answers/copy/copy.en.js` and `copy.cy.js`:
  `sections`, the check your answers headings
- `<journey>/features/check-answers/view-model/index.js`: which cards sit
  under which check your answers heading

The hub template (`features/hub/template.njk`) draws every group the same way.
It never needs to change for this recipe.

## Steps

### Rename a group or a task

1. In the hub's `copy/copy.en.js`, change the words under `groups.<group-id>`
   or `rows.<row-id>.title`. Keep the number at the start of a group heading
   ("2. ") if the others have one.
2. In `copy/copy.cy.js`, change the same key. If the designer gave no Welsh,
   write `'[Welsh needed] <the new English>'`.
3. If a group was renamed, ask whether check your answers should match. By
   default, rename the matching `sections` heading in both check-answers copy
   files too.

Never change the ids (`'arrival-and-destination'`, `'consignor'` and so on).
Only the words change.

### Add a hint under a task

Add `hint: '<text>'` beside the task's `title` in both hub copy files. The
controller already shows a hint when there is one.

### Move a task to another group, or reorder tasks

In `features/hub/controller.js`, move the task row's id within `GROUPS`. For
example, to put the consignor in group 2:

```js
export const GROUPS = [
  { id: 'about-the-consignment', rows: ['commodities', 'origin'] },
  {
    id: 'arrival-and-destination',
    rows: ['arrival', 'destination', 'consignor']
  },
  {
    id: 'consignment-parties',
    rows: ['identificationNumbers', 'contact']
  },
  { id: 'check-and-submit', rows: ['review'] }
]
```

Every task row must appear in exactly one group. `review` is the "Check and
submit" task and must stay last.

Moving a task on the task list does not change the order people are asked the
questions. If the designer wants that too, follow
[move-a-page](move-a-page.md) as well, as a separate change.

### Add, merge or remove a group

- **Add a group:** add `{ id: '<new-id>', rows: [...] }` to `GROUPS`, moving
  rows into it, and add `groups['<new-id>']` to both hub copy files.
  Renumber the other headings.
- **Merge two groups:** move all the rows into one, remove the other from
  `GROUPS`, and remove its heading from both copy files.
- **Remove a group:** only by moving its rows elsewhere. A task that is in no
  group disappears from the task list, and nobody can reach its pages from
  there. It still has to be finished before the notification can be
  submitted, so anyone who skipped it in the first pass could never submit.

A group with no tasks that apply to a notification is hidden, so an empty
group never shows.

### Keep check your answers in step

If groups changed, check your answers usually follows. Its sections are built
by `consignmentSection`, `arrivalSection` and `partiesSection` in
`features/check-answers/view-model/index.js`, with their headings in the
check-answers copy under `sections`. Follow [check-answers](check-answers.md)
to move cards or rename headings to match.

## What you will see

Open any notification's task list (the Overview page). The groups and tasks
show in their new order, with the new words. Check your answers shows the
matching headings.

## How to check it

1. `npm run designer:check -- --set <release> --full`. The quick check also
   catches a Welsh key you missed.
2. `npm run designer:show -- --set <release> --pages hub,notification-view`
   (the task list and check your answers). Read both screenshots.
3. Give the designer the link to a draft example, so they can open its task
   list.

## Hand-off notes

- Welsh added as `[Welsh needed]` is listed in the brief.
- The real team's hub tests pin the group names and order. The brief lists
  them.
- Record the recipe as `task-list` in the commit message.
