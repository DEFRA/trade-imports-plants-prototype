---
name: change-the-words
description: 'Change the words on the pages of a design release, everywhere they appear, with the Welsh kept in step: headings, labels, hints, error messages, buttons, section captions, task list groups and check your answers labels. Finds every home of a phrase first, plans the change as a table, edits English and Welsh together (marking Welsh that still needs a translator), checks and shows it. Also shows the English and Welsh side by side, because the prototype only ever shows English. Use when a designer says "change the wording", "reword", "rename X to Y everywhere", "change the hint", "change the label", "change the error message", "change the button", "change the caption", "apply these content changes", "content sweep", "show me the Welsh" or "where does this text come from". NOT for adding or removing a question or page (use change-the-journey), layout, spacing or components (use match-the-design), or example data (use example-data).'
---

# Change the words

You are helping a content or interaction designer change the words in their
design release. They know HTML, Nunjucks and the GOV.UK Design System. They
are not JavaScript developers. Reply in GDS plain English: short sentences,
active voice, and say what changed on which pages.

Say "your design release", not "set". Say "the task list", not "the hub",
unless you are naming a file. Say "the Welsh", not "cy".

## How words work in this prototype

- Every word a page shows lives in a copy file beside the page's feature:
  `copy/copy.en.js` for English and `copy/copy.cy.js` for Welsh. The two files
  have the same keys in the same shape.
- One phrase often lives in several places. "Consignment parties" is the
  caption above two pages (`journeys/linear/flow/section-captions/copy/`), a
  task list group (`features/hub/copy/`) and a check your answers heading
  (`features/check-answers/copy/`). A wording change means all of them.
- Check your answers borrows labels from other pages' copy. Changing a label
  on arrival details can change check your answers too. The find report says
  so ("Also shown on").
- Some copy is a function, because it fills in a value, like
  `` (days) => `Notifications must be made ${days} days before...` ``. Keep
  the function, its values in brackets and every `${…}` placeholder. Change
  only the words around them.
- The header, footer, "Save and continue", the error summary title and the
  notification status names (Draft, Submitted, Amending, Deleted) live in
  `src/server/app/shared/copy.en.js`. Every set uses that file and it belongs
  to the real service. It is never changed in a design release; step 3's
  vocabulary route changes it on a hand-off branch instead.
- The prototype always shows English. Welsh can only be read in the Welsh
  report (step 9).

## Guard rails

Read these before every run. Breaking one is a failure even if every check
passes.

- **Only change files the designer owns.** In a design release that is
  `src/server/app/sets/<release>/**`. Run `npm run designer:where` on every
  file before you edit it. `overrides.json` is the list the weekly update
  follows: anything not in its `ours` list belongs to the real service.
- **Never change the real journey outside a hand-off.** `high-risk-plants` is
  the real service's journey. Change its words only on a `handoff/<slug>`
  branch (step 7).
- **Never change a frozen release.** Offer a working copy of it instead
  (`design-release`).
- **Never change shared chrome in a release.** Refuse, explain and log a
  design gap (step 3).
- **English and Welsh together, always.** Every English change has a Welsh
  change in the same key. With no Welsh from the designer, write
  `'[Welsh needed] <the new English>'`. Never copy the English into the Welsh
  without the marker, and never delete a Welsh string.
- **Words only.** Change only the text inside copy files, and any code
  comment in those files that quotes the old words (so a comment never names
  words the page no longer shows). Never rename a key, add or remove a key, or
  change a function's values. Never touch templates, controllers or the flow.
  A literal string found in a template is reported, not moved (moving it is
  `match-the-design` work). A request that also changes the layout is two
  changes: see "Requests with a layout part" below.
- **The designer's words win.** You may suggest a GOV.UK style change once
  (step 5). Never apply one the designer did not ask for.
- **One Bash command per call.** Never `--no-verify`, never push, never
  commit (`share-my-change` commits).

## Step 1: Find the release

Run:

```bash
git status
```

The first line names the branch.

- If the branch starts with `handoff/`, this is **upstream-bound mode**: the
  target is `high-risk-plants`. Go to step 2, then follow step 7 as well.
- Otherwise the target is the designer's design release:
  1. If the designer named one, use it.
  2. If not, run `npm run designer:release -- list` and pick the working
     release changed most recently. If there is exactly one working release,
     use it without asking. If two or more fit and nothing points to one, ask
     one question: which release.
  3. If there is no working release at all ("my working release" when the
     list shows only `high-risk-plants` and `sample-journey`), make one now
     without asking: follow `design-release` section B with the id
     `plants-working` (or the id the designer used), save it as its own
     commit as that section says, then come back to the start of this step
     and carry on. Tell the designer in one line that you started
     `plants-working` from the real journey for them.
  4. If the release is a research release (`designer:release -- list` says
     "Research"), words changed after the sessions follow the one rule in
     `research-session`, "After the sessions", step 3: the working release it
     was made from, or else a new working release made from the research
     release (never from the real journey). Tell the designer in one line
     where the change lands, then carry on. Change a research release's words
     only when the designer says the change is for the sessions themselves.

If the designer named `high-risk-plants` (or "the real journey") on any other
branch, offer two routes in one message and default to the first:

- "Do it in your design release" (default): continue with their working
  release. If they have none, make one as in 3 above.
- "Prepare it for the real team" (upstream-bound): check the tree is clean
  with `git status`. If it is not, ask them to save their work first
  (`share-my-change`). Then run `git switch -c handoff/<short-slug> main` and
  continue in upstream-bound mode. Say that nothing is sent anywhere: the
  `hand-off` skill turns the branch into a brief and a patch later.

Refuse, in plain English, when the release is frozen: "This is a frozen
release. Start a working release from it instead." Offer `design-release`.
Refuse `sample-journey`: it is a placeholder with no journey.

If the branch is `main`, make a branch before editing:

```bash
git switch -c design/<release>-<short-slug>
```

Then check who owns the release:

```bash
npm run designer:where -- src/server/app/sets/<release>/set.js
```

In a release it must say "Yours". Stop if it does not. In upstream-bound mode
it says "Belongs to the real service": that is expected on a `handoff/*`
branch, and the only place such an edit is allowed.

## Step 2: Find every home of the words

For each phrase the designer wants changed, run:

```bash
npm run designer:words -- find "<the old words>" --set <release> --json
```

Read the JSON. It has:

- `sets`: the release, with `owner`, `kind` and `frozen`. Stop if `frozen` is
  true.
- `copy`: one entry per copy string that contains the words, with the
  `feature`, the `pages` it shows on, `alsoOn` (other pages that borrow it),
  the `keyPath`, `file` and `line`, the `en` and `cy` text, `welsh` (one of
  `translated`, `marked`, `same-as-english`, `missing`), `kind` (`string` or
  `function`) and `flags`.
- `templates`: words written straight into a `.njk` file ("should be copy").
- `pinned`: tests and specs that pin the words. Only filled in for
  `high-risk-plants`. You only act on these in upstream-bound mode.

Matching ignores capitals and treats curly and straight apostrophes alike. It
also matches the Welsh, so a designer can paste Welsh to find it.

If the designer said "everywhere" and has more than one working release, run
the find again without `--set` and include every release they own. Otherwise
leave other releases alone: a frozen release, the real journey and other
people's releases are never swept.

If nothing matched, say so and suggest fewer words, or ask the designer to
paste the text exactly as the page shows it.

## Step 3: Refuse shared chrome, log the gap

For every `copy` entry with `shared: true` (or a flag saying "shared by every
set"), and every `templates` entry with `shared: true`:

1. Do not edit it.
2. Tell the designer: "'<the words>' is part of the shared chrome in
   `src/server/app/shared/`. Every design release and the real journey use
   it, and it belongs to the real service, so changing it here would change
   every release and clash with the weekly update. I have logged it as a
   design gap so it travels with your hand-off."
3. Add a row to the end of `src/server/app/sets/<release>/design-gaps.md`.
   If the file does not exist, create it with the heading and table header
   from `.claude/skills/match-the-design/references/design-gaps.md`. The row:

   ```text
   | all pages | Change "<old words>" to "<new words>" | No change: shared chrome still says "<old words>" | The words live in the shared chrome (src/server/app/shared/copy.en.js), which every set uses and the real service owns. | None |
   ```

4. Carry on with any matches that are inside the release.
5. Say, in the same reply, how the designer can still **see** the new words
   (below). Never stop at "a gap was logged".

### Seeing a shared-chrome change: the vocabulary route

Status names ("Draft", "Submitted", "Amending", "Deleted", under
`journeyStrip` in `src/server/app/shared/copy.en.js`), the save buttons and
the other shared words can only change for every set at once. So a
vocabulary decision ("rename Submitted to Sent everywhere") goes the
upstream-bound way, on its own branch, where rule 10 allows
`src/server/app/shared/**`:

1. Offer it in one line: "Status names are shared by the whole service. I can
   make the change on a separate hand-off branch, show you the real journey
   before and after, then bring you back to your branch. Nothing changes in
   your design release." Go on when they say yes (or already asked for it to
   be made real).
2. `git status --porcelain` must print nothing (save first with
   `share-my-change` otherwise). Then:

   ```bash
   git switch -c handoff/<short-slug> main
   ```

3. Change the string in `src/server/app/shared/copy.en.js` and the same key in
   `copy.cy.js` (step 6's rules: words only, `[Welsh needed]` for Welsh not
   given). Then update the pinned tests as step 7 says, with `--set
high-risk-plants`; a shared string is also pinned by tests under
   `src/server/app/shared/` and in the features that show it.
4. Show it on the real journey, before and after:

   ```bash
   npm run designer:show -- --set high-risk-plants --pages dashboard,task-list,notification-view --before
   ```

   (Add the pages the find listed for the words.) Open the pictures and
   describe them. The designer can also click through it: `npm run dev` on
   this branch shows every set with the new words.

5. Save it on the hand-off branch (`share-my-change`, which saves any file on
   `handoff/*`), then `hand-off` writes the brief from it. Then
   `git switch <the designer's branch>` and say they are back, and that their
   design release still shows the old words until the real team merges the
   change and the weekly update brings it in.

## Step 4: Plan the change

Work out the new text for every `copy` entry in the release:

- Replace only the words the designer named. Keep the rest of the string,
  including numbers like "3. " at the start of a task list group.
- Keep the case pattern: a match at the start of a string keeps its capital
  letter; a match mid-sentence stays lower case.
- For a `function` entry, keep the function, its values and every `${…}`
  placeholder exactly.
- Welsh: if the designer gave the Welsh, use it. If not, the new Welsh is
  `[Welsh needed] <the new English>` for the whole string, numbering
  included: `'3. Consignment addresses'` gets the Welsh
  `'[Welsh needed] 3. Consignment addresses'`. The marker always comes first.
- Comments: every entry under `comments` (the find prints them as "Comments
  that quote these words", including a phrase split across two comment
  lines) gets the new words too. List them in the plan as "comment".

List `templates` entries separately as "Not changed: written in the page
template, not in copy". Offer `match-the-design` to move them into copy.

**Compare the pages the designer named with the pages the find reports.**
The designer often names pages from memory ("the caption on place of
destination"). For each page they named that the find does not list, say in
one line what that page really shows and where it lives, for example:
"Place of destination does not show 'Consignment parties': its caption is
'Destination', from the destination caption section. Moving it into the
Consignment parties section is a journey change (`change-the-journey`)."
Run `npm run designer:words -- page <page> --set <release>` to see every
string a page shows. Do not change anything on those pages to make them
match; carry on with the pages the find did list.

**The designer names a page and an element, not the words** ("the hint on
origin", "the button on arrival details"): run
`npm run designer:words -- page <page> --set <release>` and pick the string
from its list (hints are keys ending `.hint`, labels `.label`, errors sit
under `errors`). Say which string you picked, quoting its English.

**The designer names a group or heading that does not exist exactly** ("the
Arrival group" when the task list says "2. Arrival and destination"): take
the nearest match and say so in one line ("I took 'Arrival' to mean the group
'2. Arrival and destination'"). A task list group has a twin heading on check
your answers with the same words: rename both together, and say so.

Show the plan as a table in a code block, one row per string:

```text
Page(s)                                    Where                          Old                     New                       Welsh
consignor-select, identification-numbers   sections.consignmentParties    Consignment parties     Consignment addresses     [Welsh needed]
hub (the task list)                        groups.consignment-parties     3. Consignment parties  3. Consignment addresses  [Welsh needed]
notification-view (check your answers)     sections.parties               3. Consignment parties  3. Consignment addresses  [Welsh needed]
```

- Go straight on, without asking, when the change is on one page, when the
  designer said "everywhere" or "all", or when they named every page the find
  reports. Their request is the go-ahead (CLAUDE.md rule 6).
- Ask once only when the find turns up pages the designer did not name and
  did not cover with "everywhere": "'<old words>' is also on <pages you were
  not asked about>. Change it there too?" Then do not ask again. In a run
  where nobody can answer (a workflow, a trial), change only the pages they
  named and list the others under "Not changed".
- If it spans more than 5 pages, or the designer pasted a content document
  with several changes, use the wording sweep instead (see "Big sweeps"
  below).

## Step 5: Offer GOV.UK style suggestions, once

Read `.claude/rules/copy.md`. If the new words break one of its style
essentials (for example "Please enter", Title Case, a date written
"27/09/2026"), say so in one line with a suggestion. Then use the designer's
words unless they take the suggestion. Never block on style.

Also check the new words still make sense where they land. For a task list
group, `npm run designer:words -- page task-list --set <release>` lists each
group with the tasks under it (never read the hub's JavaScript for this).
When a renamed task list group or caption no longer matches what sits under
it ("Consignment addresses" over a group with no address in it, say), tell
the designer in one line, as a note for the content designer. Do not change
anything else because of it. Write the same note as a row in the release's
`design-gaps.md`, so it travels with a hand-off brief, in this shape (the
brief lists it under "Content notes", not as a design gap):

```text
| task-list | Content note: "3. Consignment addresses" also holds Identification numbers, which is not an address. | No change: the words are as the designer asked | Content designer to review | None |
```

One error message can serve several states of a page. `errors.arrivalDate.required`
on arrival details shows for a consignment that will arrive and for one that
has already arrived. Before changing an error message, search the page's
`controller.js` for its key (Grep tool) and read each place it is used. If the
new words fit only one of those states ("will arrive"), say so in one line and
suggest words that fit both. Use the designer's words if they keep theirs.

## Step 6: Edit English and Welsh

For each row of the plan:

1. Edit the English string in `copy.en.js` at the line the find gave you.
2. Edit the Welsh string at the same key in `copy.cy.js` (the find gives
   `cyFile` and `cyLine`).

Change only the text between the quotes. If the new text contains an
apostrophe, use a curly one (’) as the copy files do, or switch the quotes
around the string to double quotes.

Never create a new key or delete one. If the designer's change needs a new
string (a new hint where there was none), stop and offer `change-the-journey`
or `match-the-design`: that is not a wording change.

## Step 7: Upstream-bound mode only: update the pinned tests

Skip this step in a design release. Tests are not copied into releases.

In upstream-bound mode (`handoff/*` branch, target `high-risk-plants`):

1. Run the find again for the old words with `--set high-risk-plants` and read
   `pinned`. Also run it for the old Welsh of each changed string: tests pin
   the Welsh too.
2. In every pinned file, change the old literal to the new one. The usual
   places are the feature's `copy/copy.test.js`, its `controller.test.js`,
   `journeys/linear/flow/section-captions/section-captions.test.js` and
   `copy/copy.test.js` beside it, and `*.fit.spec.js` specs. A pinned line in
   `src/server/app/shared/section-caption.test.js` passes its own literal to
   the shared template; leave it unless it asserts the journey's copy.
3. Run, one at a time:

   ```bash
   npm run test:high-risk-plants
   ```

   ```bash
   npm test
   ```

4. If a test still fails, read its message. It is usually one more pinned
   literal. Fix it and run again, at most 3 times. Never change what a test
   checks, only the words it expects.

## Step 8: Check and show it

1. Check:

   ```bash
   npm run designer:check -- --set <release> --quick
   ```

   This formats the files, checks English and Welsh have the same keys, that
   nothing is empty, and lists every `[Welsh needed]` marker. If it fails,
   follow `check-my-change` to read the error. Fix it and run the check again,
   at most 3 times. Then stop, explain, and offer to undo ("say 'throw away
   what I just did'", which `share-my-change` does).

2. Show it, on the pages the words are on, before and after. The find in
   step 2 (run without `--json`) ends each release with the exact command,
   "To picture every page these words are on". Use that list of pages:

   ```bash
   npm run designer:show -- --set <release> --pages <the pages from the find> --before
   ```

   Do not use `--pages changed` for words: a caption or task list file is
   shared by the whole journey, so it pictures every page. Add `--errors`
   when you changed an error message (a key under `errors`), so the gallery
   shows the error state. Read the key screenshots yourself before describing
   them. Never claim a page looks right without looking.

In upstream-bound mode use `--set high-risk-plants`.

## Step 9: Show me the Welsh

When the designer asks to see or review the Welsh, or after a sweep, run:

```bash
npm run designer:words -- report <release>
```

It writes `.cache/designer/words/<release>/index.html`: every page's English
and Welsh side by side, with `[Welsh needed]`, "Same as English" and "No
Welsh" highlighted. Give the designer the path and the counts it printed. It
is the only way to read the Welsh until the real service has a language
switch. The file is not saved in git; run the command again for a fresh copy.

## Step 10: Tell the designer

Report in this shape:

```text
Done: <old words> is now <new words> on <n> pages.

Pages changed: <page names>
Strings changed: <n> (<n> English, <n> Welsh)
Welsh needed: <n> strings marked [Welsh needed], or "none"
Not changed: <template literals, shared chrome (logged as a design gap), or "none">
Gallery: <path printed by designer:show>
Welsh report: <path, if you ran it>
Checks: quick check passed

Suggested commit message:
<release>: change "<old words>" to "<new words>" on <n> pages; Welsh needed
```

Count `<n>` from the pages in your plan (step 4), never from an example. The
"Consignment parties" rename, for instance, is on 4 pages: the consignor,
identification numbers, the task list and check your answers.

Do not commit. If the designer wants to save it, they say "save my work" and
`share-my-change` commits with that message. If they already asked to save it
or open a pull request in the same message ("… then open a pull request"),
carry straight on with `share-my-change`: that request is their yes.

## Requests with a layout part

A request can mix words with layout, for example "rename Consignment parties
to Consignment addresses, and drop the extra subheadings on check your
answers". Do both in the same turn, words first:

1. Do the words part with this skill, steps 1 to 8.
2. Then follow `match-the-design` for the layout part. Before editing, open
   the template and the picture and check the element is really there. If it
   is not (a request remembered from the old Prototype Kit prototype, say),
   do not change something that looks similar: tell the designer "already
   done: check your answers here has no such subheadings", with the picture as
   proof. Never delete the numbered section headings unasked. They are the
   only headings above the cards, so add one line: "If you meant the
   numbered headings (1. About the consignment, 2. …), say so and I will
   remove them."
3. Report both parts in one reply, in the step 10 shape, with a line for each
   part.

If the prototype is running (`npm run dev`), saving files restarted it. If a
page has lost its answers, press "Reset this prototype's data" under the
release on the chooser at `http://localhost:3103/`.

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

## Big sweeps

Use the wording sweep when a change spans more than 5 pages, or the designer
pastes a content document (a table of old and new text, a crit list, a
content designer's review).

1. Turn the request into sweeps: one `{ find, replace, scope }` per change.
   `scope` is `"all"` or a list of page names from the find report.
2. Decide the Welsh: `"mark"` (no Welsh given) or `"given"` (the designer gave
   Welsh for every sweep, in the same order).
3. Launch the workflow by its path, never by name:

   ```text
   Workflow({
     scriptPath: ".claude/workflows/wording-sweep.js",
     args: {
       set: "<release>",
       sweeps: [{ find: "Consignment parties", replace: "Consignment addresses", scope: "all" }],
       welsh: "mark",
       welshText: null
     }
   })
   ```

   Every key is required, with no defaults. `welshText` is `null` with
   `"mark"`, and a list of Welsh strings (one per sweep) with `"given"`.

4. It refuses `high-risk-plants` and frozen releases. It returns a table of
   page, before, after and Welsh needed, plus the gallery path. Give that to
   the designer in the step 10 shape.

### Without the Workflow tool

On a host without the Workflow tool (Cursor, for example), do the same steps
yourself, one after another:

1. **Locate**: run step 2's find for every sweep.
2. **Plan**: make one plan (step 4) for all sweeps, grouped by feature folder.
   Flag function strings. Ask once to go ahead.
3. **Edit**: work through one feature folder at a time, English then Welsh
   (step 6).
4. **Verify**: run step 8's check. Repair at most 3 times.
5. **Show**: run step 8's show, then step 9's Welsh report.

## References

- `.claude/rules/copy.md`: the copy rules and the GOV.UK style essentials
- `docs/designers/wording-and-welsh.md`: the designer's guide to words and
  Welsh
- `.claude/workflows/wording-sweep.js`: the big sweep
- `.claude/skills/match-the-design/references/design-gaps.md`: the design gaps
  log
