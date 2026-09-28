---
name: design-release
description: Start, freeze, copy changes between, list and retire the designer's own design releases in the plants prototype - each release is a copy of the real high-risk-plants journey (or of another release) that the designer owns, that the weekly update never touches, and that shows on the chooser at / with a tag, the date it was made and links to its examples. Use when the designer says "start a new design release", "make a working copy of the journey", "make a research version", "freeze this release", "freeze what we've got as design release 2", "copy this change to release X", "carry this change into X", "retire release X", "delete release X", "which releases are there", "pick up the real team's changes", "is my release out of date", "has the real service changed since I made my copy", "I want the latest", or when a merge clashes in overrides.json or src/server/prototype-sets/ (two branches that each started a release). Other skills send here first when the designer has no working release yet. NOT for changing pages, words, layout or flow inside a release (use change-the-words, match-the-design or change-the-journey), NOT for example data (use example-data), NOT for getting a release ready for a research session (use research-session, which calls this skill to make the release) and NOT for sending a change to the real service (use hand-off).
---

# Design releases

A **design release** is the designer's own copy of the real plants journey.
It lives in `src/server/app/sets/<release-id>/`, is served at
`http://localhost:3103/<release-id>`, and is listed on the chooser at
`http://localhost:3103/`. Everything in it is the designer's: the weekly
update from the real service never touches it.

A release is a **snapshot**. It does not pick up the real team's later
changes. `npm run designer:release -- list` shows how far each release has
fallen behind ("Staying current", below). To pick the changes up, start a
fresh release and carry the designer's changes across (section E).

The designer guide is
[docs/designers/design-releases.md](../../../docs/designers/design-releases.md).
Read it before your first release in a session.

Talk to the designer in GDS plain English. Say "your design release", not
"set". Give the links.

## What each release records

`npm run new:set` writes `src/server/app/sets/<release-id>/release.json`:

| Field            | Means                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| `from`           | the set it was copied from (`high-risk-plants` or another release)          |
| `root`           | the journey the whole family started from (normally `high-risk-plants`)     |
| `purpose`        | `working`, `research` or `frozen`                                           |
| `frozen`         | `true` once frozen: nobody changes it again                                 |
| `createdAt`      | when it was made                                                            |
| `fromCommit`     | the prototype commit it was copied at                                       |
| `upstreamCommit` | the last real-service commit the prototype had then (null if not fetched)   |
| `description`    | the line under its name on the chooser                                      |
| `uuidMap`        | which of the real journey's question ids became which of this release's ids |

Never edit `release.json` by hand. `designer:release` keeps it right.

The chooser tags each set: **Real journey, updates weekly** (high-risk-plants),
**Working release**, **Research**, **Frozen** or **Placeholder**
(sample-journey), plus **Research mode on** when the release has a
`research-mode.md`.

## Guard rails

- **Never edit a frozen release.** If `release.json` says `"frozen": true`, or
  `npm run designer:release -- list` says `yes` under Frozen, refuse any change
  to it and offer a working release made from it (section C).
- **Never edit `high-risk-plants`** or `src/server/app/routes-high-risk-plants.js`
  on a `design/*` branch or `main`. They belong to the real service. Do the
  change in a design release, or use `hand-off`.
- **Check ownership before any other edit.** Run
  `npm run designer:where -- <paths>` and follow it. If a file "Belongs to the
  real service", stop and offer "do it in your design release" or `hand-off`.
  If unsure, check `overrides.json`: a release's own two globs are in `ours`.
- **Only the tools touch the shared files.** `new:set` and `designer:release`
  edit `src/server/prototype-sets/index.js`, `src/server/prototype-sets/descriptions.js`
  and `overrides.json`. Never edit those by hand for a release.
- **Never retire `high-risk-plants` or `sample-journey`.** The tool refuses.
- **Keep live releases to a handful.** More than five working or research
  releases slows every restart. Offer to retire the oldest.
- **No tests in a release.** `new:set` leaves out the real journey's tests,
  browser tests, docs and requirement files on purpose. Never copy them in.
- **One Bash command per call.** No `&&`, `;` or pipes. Never `--no-verify`,
  never force-push, never push or open a pull request without asking.

## A. See the releases

```
npm run designer:release -- list
```

It prints every set in the chooser's order with its kind, what it was made
from, when, whether it is frozen, whether research mode is on, how many
design gaps it has and how much of the real journey has changed since it was
copied ("Real journey changed since"). Read it out as a short list. Use this
first whenever the designer names a release you do not recognise.

When a release the designer is working in shows more than 0 under "Real
journey changed since", say so in one line and offer to catch up, for
example: "The real team has changed 3 pages since plants-dr2 was copied. Say
'pick up the real team's changes' and I will bring them in, keeping your
changes." Do not catch up without a yes: it makes a new release. Say nothing
about a frozen release's count unless asked, because a frozen release is meant
to stay as it is.

### Staying current

- **What the count means.** The number of pages, plus other parts such as the
  page order or the task list, that the real team changed in
  `high-risk-plants` since the release was copied from it. For a release made
  from another release, it counts from when the first release in that line
  was copied. A `-` means it does not apply (the real journey itself, the
  placeholder, or a release made from the placeholder).
- **Which pages.** Name them with:

  ```
  npm run designer:release -- drift <release-id>
  ```

  It prints the changed pages by their address (`arrival-details`,
  `consignors/select`), any other parts that changed, and how many files
  nobody sees on a page (tests, notes and requirement files) changed as well.
  Read the pages out; leave the unseen files out unless asked.

- **It only knows your branch.** The count compares with the branch you are
  on. The weekly update lands on `main`, so a branch started before it shows
  0 until `main` is brought in (`git fetch origin main`, then
  `git merge --no-edit origin/main`, with `share-my-change`'s rules and
  section G for a clash in the three shared files). Offer that when the
  designer expects a change the count does not show.
- **Catching up** is section E. Offer it; never do it on your own.

## B. Start a new release

1. **Work out the purpose and a plain name.** Ask only if the request does not
   say:
   - "a working copy", "a new design release": purpose `working`.
   - "a research version", "for research in October": purpose `research`.
   - "a snapshot for the developers", "keep this as it is", "freeze what
     we've got": that is section C. Start the release `working` and freeze
     it there, so changes can still be carried in first. Use
     `--purpose frozen` only for a copy that will never take any change.
2. **Suggest an id.** Lower-case words joined by hyphens, starting `plants-`:
   `plants-dr2` for "design release 2", `plants-working` for a working copy,
   `plants-research-oct` for October research. Check it is not taken with
   `npm run designer:release -- list`. Never use `examples`, `reset`, `auth`,
   `public` or `health`.
3. **Get onto the designer's branch.** If on `main`, make one:

   ```
   git switch -c design/<release-id>-start
   ```

   On any other branch that does not start with `handoff/`, stay on it (the
   one branch rule in AGENTS.md, "Branches"): the designer's change and its
   save then land on the same branch as the release, and `share-my-change`
   stays there too. If there are unsaved changes, ask the designer to save or
   undo them first (`share-my-change`): the release must be a commit of its
   own. When another skill sent you here mid-change, its edits are not made
   yet, so there is nothing to ask.

4. **Make it.** Copy the real journey unless the designer names another
   release to copy (then use `--from <that release>`):

   ```
   npm run new:set -- <release-id> --from high-risk-plants --title "<its name, in the designer's words>" --describe "<one line for the chooser>" --purpose <working|research|frozen>
   ```

   Without `--describe` the chooser says "Copy of high-risk-plants made
   <date>". Without `--title` the chooser names it from its id ("Plants
   dr2"); give a title whenever the designer named the release ("design
   release 2" becomes `--title "Design release 2"`). The output lists what it left out (tests, docs, requirement
   files) and the next steps.

5. **Tidy the new lines:**

   ```
   npm run designer:format
   ```

6. **Check it boots and passes every check:**

   ```
   npm run designer:check -- --set <release-id> --full
   ```

   Explain any failure in plain English (`check-my-change` explains every
   message). At most 3 repairs, then stop and explain.

7. **Take its starting gallery:**

   ```
   npm run designer:show -- --set <release-id> --pages all,chooser
   ```

   Read a few of the PNGs yourself before you describe them, including the
   chooser picture: it shows the release's tag, description and example
   links. Skip this step when another skill sent you here to make a release
   for its change: that skill's own gallery comes next.

8. **Save it.** Stage exactly these, one `git add` per path:

   ```
   git add src/server/app/sets/<release-id>
   git add src/server/app/routes-<release-id>.js
   git add src/server/prototype-sets/index.js
   git add src/server/prototype-sets/descriptions.js
   git add overrides.json
   ```

   Then:

   ```
   npm run designer:save -- -m "Start design release <release-id> from high-risk-plants"
   ```

   (Name the other release instead when it was copied from one.) The
   pre-commit checks run and take a few minutes. It prints one line when the
   save worked. When the checks fail it prints "Nothing was saved" and the
   last 60 lines of `.cache/designer/commit.log`: follow
   `check-my-change` to read the failure, fix it, and run the same commit
   again. A failure in a file outside the release (a test under `scripts/`,
   say) is not caused by the release: tell the maintainer, and do not work
   around it. Never add `--no-verify`.
   The commit adds about 150 files: that is the copy of the journey, and it is
   expected. Saving the release on its own, before any change, keeps every
   later change small and easy to review, carry or undo. This is the one save
   this skill makes without being asked: every change to the release builds
   on it.

9. **Tell the designer**, in these words or close to them: "Everything in
   `src/server/app/sets/<release-id>/` is yours. It is a snapshot of the real
   journey today and will not pick up the real team's later changes. To pick
   them up, start a fresh release and carry your changes across. It is at
   http://localhost:3103/<release-id> once you run `npm run dev`." Mention
   that its examples appear on the first signed-in visit, and that the
   chooser links to each one.

10. **Go back.** If another skill sent you here because there was no working
    release (change-the-words, change-the-journey, fake-a-service and the
    others do), return to that skill's first step now and carry on with the
    designer's change. Do not wait to be asked again.

## C. Freeze a release and carry on in a new one

"Freeze what we've got as design release 2 and give me a working copy":

1. If the work is not in a release yet, start one first (section B) with the
   frozen name, for example `plants-dr2`, and **`--purpose working`**, even
   though it is about to be frozen. The freeze in step 3 sets it to frozen.
   A release started as `--purpose frozen` cannot take a carry, so step 2
   would be refused.
2. **Carry anything that should be in the frozen release first.** If the
   designer also wants a change in the release being frozen, carry it in now
   (section D), check it and save it. This holds whatever order the designer
   says it in: "freeze DR2, with last week's change in it", "freeze DR2, then
   carry last week's change into DR2 as well" and "carry X into DR2 and
   freeze it" all mean carry first, then freeze. Say in one line that you
   did it in that order and why: once frozen, nothing can be added (the
   carry refuses a frozen target, and the checks fail on any change to it).
   A change meant for the new working copy ("then carry X into the working
   copy") is carried after the freeze instead.
3. Freeze it and make the working copy in one step. Name the copy after the
   frozen one, for example `plants-dr2-1`, and describe both for the
   chooser: `--describe` is the working copy's line, `--frozen-describe` the
   frozen release's (the last chance to change it):

   ```
   npm run designer:release -- freeze <release-id> --as <new-working-id> --frozen-title "Design release 2" --title "Design release 2: working copy" --describe "<the working copy's line>" --frozen-describe "<the frozen release's line>"
   ```

   Without `--as` the copy is called `<release-id>-working`. Without
   `--describe` its chooser line is "Copy of <release-id> made <date>".
   Without `--frozen-describe` the frozen release keeps the line it was
   started with. Without a title, the chooser names a release from its id
   ("Plants dr2", "Plants dr2 1"), so always give both titles in the
   designer's words. If the new id is taken, nothing is frozen: pick
   another. The frozen release's `release.json` now says `purpose: frozen`
   and `frozen: true`.

4. `npm run designer:format`, then
   `npm run designer:check -- --set <new-working-id> --full`. The check's
   ownership line ends "You froze <release-id> in this change": that is
   expected, not a problem.
5. Save both with one commit, with nothing else in it. Stage
   `src/server/app/sets/<release-id>/release.json`, the new release's folder
   and routes file, the two `prototype-sets` files and `overrides.json`, then:

   ```
   npm run designer:save -- -m "Freeze design release <release-id>; carry on in <new-working-id>"
   ```

   From this commit on, the checks and the pre-commit hook fail if any file
   in `<release-id>` changes.

6. Picture the chooser to confirm the Frozen tag and the new release's line:
   `npm run designer:show -- --set <new-working-id> --pages chooser`. Read
   the picture.
7. Tell the designer: "`<release-id>` is frozen and tagged Frozen on the
   chooser. Nobody will change it. Carry on in `<new-working-id>`."

## D. Copy one change into another release

"Copy this change to release X":

1. Find the change. If it is not saved yet, it is `--working`. If it is saved,
   list the release's saved changes on every branch, newest first:

   ```
   npm run designer:release -- changes <from-release>
   ```

   Each line has the commit id, the date, the branch that holds it and the
   message. The release's own "Start design release" commit is marked: never
   carry that. Several commits can share a message (a change saved again on a
   trial branch, or already carried). The list marks the newest one on a
   `design/` branch "pick this one": take that, and name its id, date and
   branch in your reply so the designer can say if it is the wrong one. When
   the designer's words ("last week's change") fit more than one different
   message, ask which, quoting the messages.

   The carry reads the release from that commit, so the other branch does not
   need merging first. A change that is not saved can only be carried from
   the branch it is on.

2. Carry it:

   ```
   npm run designer:release -- carry --from <from-release> --to <to-release> --commit <commit id>
   ```

   or, for what is not saved yet, `--working` in place of `--commit <id>`.
   It rewrites the release id and the question ids for the target, then
   applies the change. It refuses `high-risk-plants`, and a frozen target: its
   message names the working release made from the frozen one, so carry into
   that instead. To have the change in the frozen release itself, it had to be
   carried in before the freeze (section C, step 2).

3. What it says:
   - "Carried the change": done. It lists the files.
   - "by merging (the files are staged)": the target had moved on, and git
     merged the change in. Check it carefully.
   - "could not be carried cleanly": the listed files have both versions
     between `<<<<<<<` and `>>>>>>>` markers. Show the designer each clash in
     plain words, keep what they choose, and remove the markers. At most 3
     files by hand; with more, suggest making the change again in the target.
4. `npm run designer:check -- --set <to-release>`, then
   `npm run designer:show -- --set <to-release> --pages <the pages the change is on> --before`.
   For a change to words, `npm run designer:words -- find "<new words>" --set <to-release>`
   prints the pages. `--pages changed` pictures every page when the change
   is to a caption or other shared copy.
5. Save it (with `share-my-change`'s rules): the message says
   `<to-release>: <the change>, carried from <from-release>`.

## E. Pick up the real team's changes

A release never updates itself. To bring in what the real team has built
since the release was made:

1. Name what changed: `npm run designer:release -- drift <old-release>`.
   Tell the designer which pages will change. If it says nothing changed,
   stop there and say so (and see "Staying current" for a branch behind
   `main`).
2. Start a fresh release from `high-risk-plants` (section B), for example
   `plants-dr3`.
3. List the designer's saved changes in the old release:

   ```
   npm run designer:release -- changes <old-release>
   ```

   It lists them newest first: carry them oldest first. Leave out the one
   marked as the release itself ("Start design release …"), and any
   repeat of a message (take the one marked "pick this one").

4. Carry each change across in that order (section D, `--commit`). Where the
   real team changed the same lines, the carry reports a clash: settle each
   one with the designer.
5. Check and save as in section D. Show the pages step 1 named, so the
   designer sees the real team's changes next to their own:
   `npm run designer:show -- --set <new-release> --pages <the pages from step 1>`.
6. `npm run designer:release -- list` now shows 0 for the new release. Offer
   to freeze or retire the old one.

## F. Retire a release

"Retire release X" or "delete release X":

1. Confirm with the designer by name. Say: "This removes `<release-id>`, its
   examples and its line on the chooser from this branch. It stays in git
   history." It refuses a saved release with unsaved changes: save or undo
   them first (`share-my-change`).
2. Retire it:

   ```
   npm run designer:release -- retire <release-id>
   ```

   It removes the folder and routes file (`git rm`), the mount, the chooser
   description, its two `overrides.json` lines, and its example scenario,
   fixtures and extra data if it has them. It prints each removal.

   **A release that was never saved** is refused with "was never saved": it
   is not in git history, so removing it is for good. Tell the designer that
   in those words and ask whether to throw it away or save it first. Only on
   their yes (or when you made it yourself in this run and nothing was
   changed in it since), run it again with `--discard`. It then says "gone
   for good and there is nothing to save": skip steps 3 and 4.

3. `git status` should show only those removals and the three shared files.
   Stage the three shared files:

   ```
   git add overrides.json
   git add src/server/prototype-sets/index.js
   git add src/server/prototype-sets/descriptions.js
   ```

4. `npm run designer:check -- --set high-risk-plants --full`, then:

   ```
   npm run designer:save -- -m "Retire design release <release-id>"
   ```

   If it prints "Nothing was saved", act on the log lines it prints, as in
   section B, step 8.

## G. Two branches that each started a release

Every new release adds a line at the same place in `overrides.json`,
`src/server/prototype-sets/index.js` and `src/server/prototype-sets/descriptions.js`.
So merging two branches that each started a release (or pulling `main` after
someone else started one) always clashes in those three files. Never settle
that clash by hand. When git reports a conflict in any of the three:

1. Run:

   ```
   npm run designer:release -- remount
   ```

   It puts back this branch's side of each clashing file, then mounts,
   describes and marks as yours every release folder on disk, and takes out
   any release whose folder is gone.

2. `npm run designer:format`, then mark the three files resolved:

   ```
   git add overrides.json src/server/prototype-sets/index.js src/server/prototype-sets/descriptions.js
   ```

3. If other files clash too, those are real clashes: settle them with the
   designer as in section D, step 3.
4. `npm run designer:check -- --set <release> --full`, then finish the merge
   with `npm run designer:save -- --no-edit`.

`remount` is also safe to run at any time: when everything is mounted it says
so and changes nothing.

## Verify

- `npm run designer:release -- list` shows the release with the right kind,
  "made from" and date (or no longer shows it, after retiring). A release
  just made from the real journey shows 0 under "Real journey changed since".
- `npm run designer:check -- --set <release-id> --full` passes. It includes
  every unit test, so "2 sets are mounted" never appears: no tests are copied.
- The chooser shows the release's tag, its "Made from … on …" line, its
  description and links to its examples. See it without a browser:
  `npm run designer:show -- --set <release-id> --pages chooser`, then read
  the chooser picture.
- An example link (`http://localhost:3103/examples/<release-id>/<example>`)
  opens the page the example stops on, even after a restart.
- `overrides.json` has exactly the two lines for each live release, and none
  for a retired one.

Every pull request also runs a canary: it makes a throwaway release from the
real journey and checks it lints, passes the tests and shows on the chooser.
If it fails after a weekly update, making new releases is broken: tell the
maintainer.

## Hand-off

Releases never go to the real service as a whole, and never flow upstream.
Single changes do, through `hand-off`, which turns the release's ids back into
the real journey's with `uuidMap`.

End with: "If this should become part of the real service, say 'hand this to
the real team' and I will prepare a brief and a patch for the plants-frontend
team."

## Without the npm script

If `designer:release` is not in `package.json` yet, run the same script
directly: `node scripts/designer/release/cli.js <list|drift|orders|changes|freeze|carry|retire|remount> …`
with the same arguments.
