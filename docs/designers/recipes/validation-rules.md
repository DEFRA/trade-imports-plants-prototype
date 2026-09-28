# Change what counts as a valid answer

This recipe mirrors the real plants-frontend's own
`src/server/app/docs/validation.md` ("Save rules and completion rules") and
`src/server/app/docs/obligation-model.md` (the obligation `status` this
recipe's completion rule sets).

## When to use it

Use this recipe to change the rules a page checks when someone presses
Continue, and the error messages those rules show. For example:

- "Make the consignment number optional."
- "Make this question required."
- "The reference must be exactly 8 digits."
- "Show a separate error when the date is in the past."

Do not use it:

- to change only the words of an existing error message: use
  `change-the-words`
- to let research participants past errors for a session: use
  `research-session`, which switches rules off in a way that is easy to undo

## Two kinds of rule

Every question has two separate rules. Change both, or the page and the task
list disagree:

1. **The save rule**, in the page's controller. It decides whether Continue
   works or the page shows an error. It is built from the validation
   factories in `src/server/app/lib/validate/index.js`.
2. **The completion rule**, in the obligation's `status` in the set's
   `obligations/sections/` files. `'mandatory'` means the notification cannot
   be submitted without it. `'optional'` means it can.

For example, making a question optional on the page but leaving it
`'mandatory'` lets people continue with a blank answer, then blocks them at
check and submit. That is almost never what the designer wants.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `<journey>/features/<feature>/controller.js`: the save rules, usually in a
  function called `fields()` built with `compose(...)`
- `<journey>/features/<feature>/copy/copy.en.js` and `copy.cy.js`: the error
  messages, usually under `errors`
- `src/server/app/sets/<release>/obligations/sections/<section>.js`: the
  completion rule (`status`)
- `<journey>/flow/fixtures/happy-path.json`: the example answers

Never edit `src/server/app/lib/validate/`: the factories belong to the real
service and every set shares them.

## The factories

Each takes the field name first. The field name, the form field's `name` and
`id`, and the error key are always the same string.

Required (blank shows an error):

- `requiredText(name, message)`
- `requiredMaxText(name, max, { required, maxLength })`
- `requiredExactDigits(name, digitCount, { required, length, digitsOnly })`
- `requiredEmail(name, max, { required, maxLength, format })`
- `requiredOneOf(name, allowedValues, message)`, for radios and selects
- `requiredIntegerInRange(name, { min, max, messages: { required, invalid } })`
- `requiredDateText(name, { required, invalid })`
- `requiredDateTextInRange(name, { min, max, messages: { required, invalid, range } })`
- `requiredTime(name, { required, invalid })`, for a 24-hour time like 14:30

Optional (blank is allowed, anything entered must be valid):

- `optionalText(name)`
- `maxText(name, max, message)`
- `pattern(name, regularExpression, message)`
- `postcode(name, message)`, `vehicleReg(name, message)`,
  `ukPhone(name, message)`
- `oneOf(name, allowedValues, message)`
- `integerInRange(name, { min, max, message })`
- `dateText(name, message)`, `dateTextInRange(name, { min, max, invalidMessage, rangeMessage })`

Some messages, such as `maxLength` and `invalid`, fall back to a shared
default if you leave them out. Always pass the designer's words instead.

Combine rules with `compose(ruleA, ruleB)`. Never compose a required rule with
an optional one for the same field (for example `requiredText` with `maxText`):
the blank allowance wins and the field stops being required. Use the single
required factory instead (`requiredMaxText`).

## Steps

### Make a required question optional

1. In the controller, swap the required factory for its optional partner:
   `requiredText` for `optionalText` or `maxText`, `requiredOneOf` for
   `oneOf`, `requiredIntegerInRange` for `integerInRange`,
   `requiredDateText` for `dateText`.
2. In the obligations file, change the question's `status` to `'optional'`.
   If it has an `applyTo` gate, change the `status` inside the gate's first
   decision too.
3. Leave the old error message in the copy files if another rule still uses
   it. Remove it from both files if nothing does.
4. Add "(optional)" to the question's label in both copy files, as GOV.UK
   asks: `change-the-words` explains the pattern.

### Make an optional question required

1. Swap the factory the other way, and pass a required message.
2. Add the message to both copy files under `errors`. Follow the GOV.UK
   pattern: "Enter ...", "Select ...". With no Welsh from the designer, write
   `'[Welsh needed] <the English>'`.
3. Change the `status` to `'mandatory'`.
4. Update the example data: every scenario in `happy-path.json` that reaches
   the page needs an answer for it. Then run
   `npm run designer:examples -- check <release>`.

### Add or change a format rule

Use the matching factory, or `pattern(name, /^\d{8}$/, message)` for a
format no factory covers. Add a message for each way the answer can be wrong,
in both copy files. If the example answers no longer pass the rule, fix them
in `happy-path.json`.

## What you will see

Press Continue with the answer blank or wrong. An error summary appears at the
top, the field shows its error, and the error summary link moves to the field.

## How to check it

1. `npm run designer:check -- --set <release> --full`
2. `npm run designer:examples -- check <release>`
3. `npm run designer:show -- --set <release> --pages <page-id> --errors`. The
   gallery shows the page submitted empty. For a rule that only fails on a
   wrong answer, check it by hand in the running prototype and say so.

## Hand-off notes

- A changed rule changes what the service accepts. The real team will check
  it against the regulations and the backend's own rules.
- Record the recipe as `validation-rules` in the commit message.
