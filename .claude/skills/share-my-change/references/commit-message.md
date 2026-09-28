# Writing the save message

A saved change's message is read by other designers in the history, by
reviewers in the pull request, and by `hand-off` (which reads recipe names from
it). Write it from the change itself, never from memory of the conversation.

## The first line

`<set-id>: <what changed> on <where>[; Welsh needed]`

- Start with the design release id, then a colon.
- Say what changed with a plain verb in the present tense: rename, reword,
  add, remove, move, show, hide, group, split, fill.
- Quote changed words exactly, in single quotes.
- Say where: name the pages when there are 1 to 3 ("on arrival details and
  origin"), otherwise count them ("on 6 pages"). A change to a section
  caption, the task list or a shared copy file counts every page that shows
  it.
- End with `; Welsh needed` when any `copy.cy.js` in the change has a
  `[Welsh needed]` marker.
- Aim for under 100 characters. Sentence case. No full stop. When the quoted
  words make it longer, shorten the verb part ("rename 'X' to 'Y'" becomes
  "'X' is now 'Y'"), or drop the page count to the body's `Pages:` line.
  Never cut a quoted word.

How to count pages: a file under `journeys/linear/features/<feature>/` is that
feature's pages (its `page.js` lists their `slug`s). For words, count the
pages `npm run designer:words -- find "<new words>" --set <set-id>` lists
("Shown on" and "Also shown on"). Files under `journeys/linear/flow/` or
`obligations/` touch the journey as a whole: say "across the journey" unless
you can name the pages. Never copy a count from an example here.

Examples (the counts are the real ones for these changes):

- `plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed`
  (the consignor, identification numbers, the task list and check your
  answers)
- `plants-working: add a 'more than one vehicle' question to arrival details; Welsh needed`
- `plants-dr2-1: move place of destination before the consignor`
- `plants-working: show the reference number in a green panel on confirmation`
- `plants-research-arrival-202610: add an example stopped at identification numbers`

## The body

One fact per line, only the lines that apply:

```
Pages: arrival-details, origin
Recipe: add-a-field, add-a-branch
Design gaps: 1 added (dashboard status chips)
Welsh needed: 3 strings
Examples: happy path updated for the new question
```

`Recipe:` names the recipe the change followed, exactly as its file is named
(`add-a-field`, `add-a-page`, `add-a-section`, `add-a-collection`,
`journey-flow-and-gates`, `obligation-model`, or a designer recipe in
`docs/designers/recipes/` such as `move-a-page` or `add-a-branch`). `hand-off`
finds recipes by these names.

## What never goes in a message

- Ticket numbers you have not been given.
- The words "WIP", "fix" on its own, or "changes".
- Anything about how the change was made (which tool, which attempt).
