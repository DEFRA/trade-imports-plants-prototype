# Wording and Welsh

This guide explains where the words on a page come from, how to change them
everywhere at once, and how to keep the Welsh in step.

## What to say to Claude

You do not need to find files yourself. Say what you want in your own words:

- "Rename 'Consignment parties' to 'Consignment addresses' everywhere"
- "Change the hint on origin to 'The country the plants were grown in'"
- "Change the arrival date error to 'Enter the date the consignment will
  arrive'"
- "Apply these content changes" (then paste your table or document)
- "Where does 'Place of landing' come from?"
- "Show me the Welsh"

Claude uses the `change-the-words` skill. It finds every place the words
live, shows you a plan, changes the English and the Welsh together, checks
the prototype still works and shows you the pages.

Adding or removing a question is not a wording change: say "add a question"
and Claude uses `change-the-journey`. Moving things around or changing how a
page looks is `match-the-design`.

## Where the words live

Every page in your design release has a feature folder under
`src/server/app/sets/<your-release>/journeys/linear/features/`. Inside it,
`copy/copy.en.js` holds the English and `copy/copy.cy.js` holds the Welsh.
The two files have exactly the same shape: the same names (keys) in the same
places.

A few words live somewhere else:

- **Section captions** (the small grey line above a page heading, like
  "Arrival") live in `journeys/linear/flow/section-captions/copy/`. One
  caption serves every page in its section.
- **Task list groups and rows** live in `features/hub/copy/`.
- **Check your answers** has its own headings and labels in
  `features/check-answers/copy/`, and it also borrows labels from other
  pages' copy.
- **The header, footer, "Save and continue" and the error summary title** live
  in `src/server/app/shared/`. Every set uses them, and they belong to the
  real service (see below).

So one phrase can live in several places. "Consignment parties" is a section
caption above two pages, a task list group and a check your answers heading.
That is why a wording change starts with a search:

```bash
npm run designer:words -- find "Consignment parties" --set <your-release>
```

It lists every place, with the page it shows on, the file and line, and the
English and Welsh side by side. It also lists words written straight into a
page template (these should be moved into copy) and, for the real journey,
the tests that check the words.

## Words that fill in a value

Some copy fills in a value, like a number of days. In the copy file it looks
like this:

```js
potatoes: (days) =>
  `Notifications for potatoes must be made at least ${days} days before the expected date of arrival.`
```

You can change the words, but `(days)` and `${days}` must stay exactly as
they are: that is where the number goes.

## Words you cannot change in a design release

The shared chrome (the header, service navigation, footer, "Save and
continue", "There is a problem") is used by every set, including the real
journey, and it belongs to the real service. Changing it in the prototype
would change every design release at once and clash with the weekly update.

If you ask for one of these, Claude will not change it. It will explain why
and add a row to your release's `design-gaps.md`, so the request travels with
your hand-off to the real team.

## Why the Welsh matters

The real service must be available in Welsh. Every English string has a Welsh
string at the same place. If the two drift apart (a key in English with no
Welsh, or Welsh that is really English), the real team has to find and fix
every one before the service can go live.

The Welsh in this prototype is a machine draft. A translator has not checked
it. Treat it as a placeholder that has the right shape.

## The [Welsh needed] marker

When you change the English and you do not have the Welsh, Claude writes the
Welsh as:

```text
[Welsh needed] Consignment addresses
```

That keeps the shape right, makes it obvious nobody has translated it yet, and
lets the hand-off list every string a translator needs to see. If you have
the Welsh, give it to Claude with your change and it will use it.

Never leave the English copied into the Welsh without the marker: it looks
translated when it is not.

## Seeing the Welsh

The prototype always shows English: the real service has no language switch
yet. To read the Welsh, say "show me the Welsh", or run:

```bash
npm run designer:words -- report <your-release>
```

It writes a page to `.cache/designer/words/<your-release>/index.html`. Open it
in your browser. It shows every page's English and Welsh side by side, in
journey order, with three things highlighted in yellow:

- **[Welsh needed]**: changed English waiting for a translator
- **Same as English**: Welsh that is really English with no marker
- **No Welsh**: a string with no Welsh at all

The top of the page counts each kind. The report is not saved in git. Run the
command again whenever you want a fresh one, and share the file with a
translator if they need it.

## Big content changes

For a change on more than 5 pages, or a pasted content document with several
changes, Claude runs the wording sweep (`.claude/workflows/wording-sweep.js`).
It does the same steps as a single change, for many changes at once, and ends
with one table of every page, the old words, the new words and whether Welsh
is needed.

## Checking and showing a wording change

After every change Claude runs:

```bash
npm run designer:check -- --set <your-release> --quick
```

This checks the English and Welsh have the same shape, that nothing is empty,
and lists every `[Welsh needed]` marker. Then:

```bash
npm run designer:show -- --set <your-release> --pages changed
```

This takes screenshots of every page the change touched. For an error message
Claude adds `--errors`, so you see the page with the error showing.

## Making a wording change real

Words agreed in your design release still only exist in the prototype. To
send them to the real plants team, say "hand this to the real team". The
`hand-off` skill prepares a brief and a patch, with a table of old and new
English and every string that still needs Welsh.

Claude can also make the change in the real journey on a `handoff/<name>`
branch. There it also updates the tests that check the old words, and runs
the full test suite. This is for changes you are ready to hand over, not for
trying things out.
