# Relaxing a save rule for research

Read this before you change any rule in research mode. Every change stays inside
`src/server/app/sets/<set-id>/`, the research release. Nothing here touches the
engine, `lib/validate`, `shared/` or another set.

Two kinds of rule stop a participant:

1. **Save rules.** A page will not save until its answers pass. They live in the
   page's `controller.js`, in the `fields` it builds with `compose(...)`.
2. **Submit requirements.** The notification cannot reach check your answers or
   be submitted until every mandatory answer is given. They live in the
   release's `obligations/sections/*.js`, as `status: 'mandatory'`.

Relaxing a save rule alone lets a participant leave a page blank. They will then
be sent back to it before they can submit. If the task goes as far as submitting,
relax the submit requirement for the same answer as well.

## 1. Find the page

Page folders are under
`src/server/app/sets/<set-id>/journeys/linear/features/<page>/`. Each has a
`controller.js`. The page's address (slug) is in the folder's `page.js`.

## 2. Swap each required rule for its blank-allowed twin

The rules come from `src/server/app/lib/validate/index.js`. Swap only the ones
the designer chose. Keep every other argument, so format checks still run on
anything a participant does type.

| Required rule (now)                                     | Blank-allowed twin (research)                                                                         | How the arguments change        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------- |
| `requiredText(name, message)`                           | `optionalText(name)`                                                                                  | drop the message                |
| `requiredMaxText(name, max, { required, maxLength })`   | `maxText(name, max, maxLength)`                                                                       | keep the length message         |
| `requiredExactDigits(name, count, messages)`            | `optionalText(name)`                                                                                  | drop the messages               |
| `requiredEmail(name, max, messages)`                    | `maxText(name, max, messages.maxLength)`                                                              | the email format check goes too |
| `requiredOneOf(name, values, message)`                  | `oneOf(name, values, message)`                                                                        | same arguments                  |
| `requiredIntegerInRange(name, { min, max, messages })`  | `integerInRange(name, { min, max, message: messages.invalid })`                                       | keep the invalid message        |
| `requiredDateTextInRange(name, { min, max, messages })` | `dateTextInRange(name, { min, max, invalidMessage: messages.invalid, rangeMessage: messages.range })` | keep the bounds                 |
| `requiredDateText(name, messages)`                      | `dateText(name, messages.invalid)`                                                                    | keep the invalid message        |
| `requiredTime(name, messages)`                          | `optionalText(name)`                                                                                  | the time format check goes too  |

Then fix the import list at the top of the controller: remove the names you no
longer use and add the new ones. An unused import fails `npm run lint`.

To let **anything** through on a text field (no format check either), remove
that field's rule from `compose(...)` instead. Never do this to a date: the page
stores dates as day, month and year, and only the date rules make sure of that.

### Worked example: arrival details

In `journeys/linear/features/arrival-details/controller.js` the date is
required:

```js
const dateRule = (bounds) =>
  requiredDateTextInRange(ARRIVAL_DATE, {
    max: bounds.max,
    messages: {
      required: copy.errors.arrivalDate.required,
      invalid: copy.errors.arrivalDate.invalid,
      range: copy.errors.arrivalDate.inFuture
    }
  })
```

For research it becomes:

```js
const dateRule = (bounds) =>
  dateTextInRange(ARRIVAL_DATE, {
    max: bounds.max,
    invalidMessage: copy.errors.arrivalDate.invalid,
    rangeMessage: copy.errors.arrivalDate.inFuture
  })
```

and the import swaps `requiredDateTextInRange` for `dateTextInRange`. A blank
date now saves. A date that is not real, or is in the future when the
consignment has already arrived, still shows its error.

The potato time and place of landing (`requiredTime`, `requiredOneOf` in
`potatoRules`) are separate rules. Relax them only if the designer asked for
them, and read what they asked like this:

- "let them leave the date blank": that one rule only.
- "let them get past arrival details", "don't let the page stop them": every
  required rule on that page, the potato time and place of landing included.
- Not sure which: relax the rules they named, and say which other required
  rules on the page are still on.

Either way, `research-mode.md` lists every rule you relaxed, one row each, so
the designer can see exactly what participants can skip.

## 3. Relax the submit requirement too (only if the task submits)

In the release's `obligations/sections/<section>.js`, find the obligation with
the same `name` as the field (for example `arrivalDate` in `arrival.js`) and
change `status: 'mandatory'` to `status: 'optional'`. If the obligation has an
`applyTo` gate, change the `status: 'mandatory'` inside its in-scope result as
well. `optional` is already used by the real journey (see `review.js`).

## What research mode cannot relax

- **Commodity type and country of origin.** The engine insists on these before
  later pages open (`ENFORCED_AT_CONTINUE` in
  `src/server/app/bridge/obligation-source.js`). That file is the engine's, so
  research mode never changes it. Start each task from an example that already
  has them.
- **Lists of things (commodities).** Add-another lists have their own count and
  completeness rules. Do not change them in research mode; ask the maintainer.
- **Check your answers.** It shows its own errors for missing or deleted
  addresses and origin problems. Those come from the answers, not a save rule.
  Give the task an example whose addresses are already chosen.
- **Anything outside the research release.** `designer:research -- on` only
  saves controllers, obligations and `research-mode.md` inside the release, and
  refuses deletions.

## 4. Log every change

Every file you changed must appear in `research-mode.md` (see
`research-mode-template.md`). `designer:research -- on` refuses to save a
changed controller or obligation file the log does not name.
