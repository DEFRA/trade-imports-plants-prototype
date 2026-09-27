# Journey recipes

These recipes change how a journey flows in your design release: which pages
it has, in what order, who sees them, and what the task list, check your
answers and confirmation pages show.

You do not need to follow them yourself. Ask Claude in plain words, for
example "only show the vehicles page if they answer Yes", and the
`change-the-journey` skill picks the recipe and follows it. They are here so
you can see what will change, and so the real team can see how a change was
made.

Every recipe has the same parts: when to use it, the files it changes in a
release, the steps, what you will see, how to check it, and notes for handing
it to the real team.

## Designer recipes

- [Add a branch](add-a-branch.md): show a page only when an earlier answer
  says so, or skip a page for some people.
- [Move a page](move-a-page.md): change where a page sits in the journey.
- [Add a guidance page](guidance-page.md): a page that explains something and
  asks nothing.
- [Change the task list](task-list.md): regroup, reorder or rename tasks and
  groups.
- [Change check your answers](check-answers.md): reorder, add, remove or
  rename sections, cards and rows.
- [Change the confirmation page](confirmation-variant.md): the panel, a "what
  happens next" section, or different content for different notifications.
- [Change what counts as a valid answer](validation-rules.md): make a question
  optional or required, or add a format rule.

## Recipes from the real plants team

The plants team's own recipes cover adding things to the real journey. The
skill follows them in your release, leaving out the steps that write
automated tests. They live with the real journey, in
`src/server/app/sets/high-risk-plants/docs/`:

- `add-a-field.md`: add a question to an existing page.
- `add-a-page.md`: add a page that asks at least one question.
- `add-a-section.md`: add a new task with its own pages.
- `add-a-collection.md`: let people add more than one of something ("add
  another").

## Words used here

- **Your design release**: your own copy of the journey, in
  `src/server/app/sets/<release>/`. Everything in it is yours to change.
- **The first pass**: the walk through the pages when someone starts a new
  notification.
- **The task list**: the "Overview" page of a notification. The code calls it
  the hub.
- **An obligation**: something a notification must, or may, contain. Each
  question on a page fills one.
- **A gate**: the rule that says when an obligation, and so its page, applies.

`docs/designers/glossary.md` has the full list.

## One change at a time

Each request makes one change, checks that the prototype still starts and the
examples still reach the end, and shows you the result. If a check fails, the
skill tries to fix it up to 3 times, then stops, explains, and offers to undo
the change.
