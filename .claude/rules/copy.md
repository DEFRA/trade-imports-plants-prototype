---
paths:
  - '**/copy/copy.en.js'
  - '**/copy/copy.cy.js'
---

# Copy: English and Welsh together

You are editing words a user reads. Every string in a copy file reaches a page.

This rule adds a design-release layer on top of the workspace's own
`~/git/defra/trade-imports-workspace/.claude/rules/copy.md`, which already
applies to every `copy.en.js`/`copy.cy.js` in this repo: read that one
first for the GDS wording rules (plain English, active voice, dates and
numbers). What is different here: a design release is allowed the
`[Welsh needed]` marker (below), which the real journey's own, stricter
copy-parity tests refuse.

## Before you edit

- Find every home of the words first:
  `npm run designer:words -- find "<words>" --set <set-id>`. One phrase often
  lives in a caption, a task list group and a check your answers heading.
- Check who owns the file: `npm run designer:where -- <path>`. A file that
  "belongs to the real service" is changed in the real repository instead
  (see the workspace `prototype` skill's build-it-for-real reference),
  never in this design release.
- `src/server/app/shared/copy.en.js` and `copy.cy.js` are shared by every set
  and owned by the real service. Never change them in a design release: log a
  design gap in the release's design-gaps.md file instead.
- Never edit a frozen release (its `release.json` says `"frozen": true`).

## The rules

- **Change English and Welsh in the same edit.** Every change to
  `copy.en.js` has a matching change at the same key in `copy.cy.js`.
- **Keep the shape identical.** The same keys, in the same nesting, in both
  files. A string stays a string. A function stays a function with the same
  number of values in its brackets, and keeps every `${…}` placeholder.
- **Words only.** Do not rename, add or remove keys during a wording change.
  Controllers and templates read them by name.
- **No empty strings**, in either language. Every string must have words in
  it.
- **Welsh that nobody has translated carries the marker.** With no Welsh from
  the designer, write `'[Welsh needed] <the English>'`. Never copy the English
  into the Welsh file without the marker: the Welsh would look translated when
  it is not. In a design release the marker is the rule, and the hand-off
  brief lists every marker as Welsh still needed.
- **Link addresses are the same in both files, with no marker.** A value that
  is only an address (`https://…`, `mailto:`, `tel:` or a path starting `/`),
  or any key whose name ends in `Href` or `Url`, may be copied straight into
  the Welsh. Never write `[Welsh needed]` in front of an address: it breaks
  the link.
- **Keep the comments at the top of a Welsh file.** They say the Welsh is a
  machine draft awaiting a translator. A code comment that quotes words you
  changed is updated with them.
- **Use curly apostrophes (’) in new text**, as the copy files do. If you use a
  straight one, put the string in double quotes.
- **The designer's words win.** Suggest a style change once, in one line.
  Never apply one they did not ask for.

## GOV.UK style essentials

Use these to suggest, not to override.

- **Sentence case** for headings, labels, buttons and captions: "Check your
  answers", not "Check Your Answers". Proper nouns keep their capitals (Great
  Britain, EPPO).
- **Plain English.** Short words and short sentences (25 words at most). Say
  "use", not "utilise"; "buy", not "purchase"; "help", not "assist".
- **Active voice.** "We will send you an email", not "An email will be sent".
- **Talk to the user as "you".** Avoid "the user" and "the applicant".
- **No "please"** in instructions, hints or errors. It makes an instruction
  sound optional.
- **Dates** in the form 27 September 2026. No ordinal endings ("27th"), no
  leading zero. Example dates in hints follow the page's input: for a date
  input, "For example, 27 3 2026" is the GOV.UK pattern; keep the page's
  existing example if the designer did not ask to change it.
- **Times**: follow what the page already uses (this service asks for the
  24-hour clock, "14:30").
- **Numbers**: write them as numerals ("3 days", not "three days"), except in
  a phrase like "one or more". Use commas in numbers over 999 ("1,000").
- **No exclamation marks**, no "click here", no ampersands (&) in sentences.
- **Headings and buttons** say what happens: "Save and continue", "Delete
  notification".
- **Hint text** explains how to answer, not what the question means. No
  links in hints.

### Error messages

- Say what went wrong and how to fix it, in the words of the question. Be
  specific: "Enter the arrival date", not "This field is required".
- Use the GOV.UK patterns:
  - empty text box: "Enter <what>", for example "Enter the arrival date"
  - nothing chosen: "Select <what>", for example "Select the place of
    landing"
  - yes or no not chosen: "Select yes if <the question>"
  - a date that is not real: "<Thing> must be a real date"
  - a date in the past or future: "<Thing> must be today or in the future",
    "<Thing> must be in the past"
  - too long: "<Thing> must be <n> characters or less"
  - wrong format: "Enter <thing> in the correct format", with an example
- Avoid "valid", "invalid", "error", "forbidden", "illegal", "you forgot" and
  "please".
- The same message goes in the error summary and beside the field; the
  template does that from one copy string.

## After you edit

- `npm run designer:check -- --set <set-id> --quick` checks the shape of both
  files and lists every `[Welsh needed]` marker.
- `npm run designer:words -- report <set-id>` writes the English and Welsh
  side by side, so the Welsh can be read at all.
