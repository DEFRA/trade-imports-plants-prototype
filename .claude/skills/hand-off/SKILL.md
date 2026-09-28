---
name: hand-off
description: Prepare a designer's change in the plants prototype for the real plants-frontend team - a brief in plain English (and in Jira wiki markup), before-and-after screenshots, a table of changed words, and an upstream.patch checked with git apply --check against the real journey, plus what the real team must know - Welsh still needed, tests that pin the old words, prototype-only services, design gaps, research-mode rules, and where the real journey has moved on. Route 1 (default) writes the hand-off folder from a design release; route 2 (upstream-bound) also applies the ready part to high-risk-plants on a handoff/<slug> branch with its tests, via the prepare-handoff workflow. Use when the designer says "hand this to the real team", "send this to the developers", "make this real", "raise this with plants-frontend", "write a brief for the developers" or "prepare this for the real service". NOT for saving or sharing work in the prototype (use share-my-change), NOT for making the change itself (use the change skills), and NOT for pushing anything to plants-frontend (nothing ever is).
---

# Hand off

Prepares a change made in a design release so the real plants-frontend team
can take it: a folder `handoffs/<yyyy-mm-dd>-<slug>/` with

- `brief.md`: what and why, each page with screenshots and a table of changed
  words, Welsh needed, tests that pin the old words, what cannot ship as it
  is, the recipe used, what was left out and why, and how to apply it,
- `brief.jira.txt`: the same in Jira wiki markup, ready to paste into a story,
- `upstream.patch`: the change as the real team's files, in `git apply`
  format, checked against the real journey,
- `report.json`: the same facts as data,
- `screenshots/`: at most 2 MB of pictures from `designer:show`.

Talk to the designer in GDS plain English. Say "the real team" or "the
plants-frontend team", "your design release", "the brief". Never say "upstream"
without explaining it once ("the real service's code").

## Guard rails

- **Nothing is ever pushed to plants-frontend.** Its push address is `DISABLED`
  in this repository on purpose. Never change that, never add another remote.
- **Never merge a `handoff/*` branch into the prototype's `main`.** Once the
  real team merges the change, Monday's weekly update brings it in.
- **Never edit high-risk-plants on a `design/*` branch or `main`.** Only route
  2 changes it, and only on its own `handoff/<slug>` branch.
- **Check ownership first.** Run `npm run designer:where -- --changed` and
  check `overrides.json`: a hand-off starts from the designer's own saved
  files.
- **One Bash command per call.** Never `--no-verify`, never
  `git reset --hard`, never force anything, never push or open a pull request
  without asking.
- **Never edit `.claude/settings.json`, `.claude/settings.local.json` or
  anything under `.claude/hooks/`.**

## Before either route

1. Find the design release (the set the change is in). If the designer names
   `high-risk-plants`, explain it is the real journey itself: the change must
   be made in a design release first (default), or they want route 2.
2. Run `git status --porcelain`. If anything is unsaved, save it first with
   `share-my-change`, so the hand-off matches what is saved.
3. If `src/server/app/sets/<set-id>/research-mode.md` exists, say research mode
   is on and its rules can never ship. Offer to switch it off first
   (`npm run designer:research -- off <set-id>`, the `research-session`
   skill). If they keep it on, the brief lists each rule under "cannot ship".
4. **Check the change exists.** The designer names a change ("hand off the
   Consignment addresses wording"). Look for it in the release: for words,
   `npm run designer:words -- find "<the new words>" --set <set-id>`; for
   anything else, `git log --oneline -- src/server/app/sets/<set-id>`. If it
   is not there, it was never made, or it was made in another release: say
   so, and offer to make it now with the right skill (`change-the-words` for
   words), save it, and then hand it off. Never hand off an empty change:
   `designer:handoff` refuses one in plain words.
5. Agree a slug for the folder, two to four words with hyphens, for example
   `consignment-addresses`. Ask once what the change is for and why, in one or
   two sentences, unless the conversation already says. That becomes `--why`.
   **Use only the designer's own words for `--why`.** Never make up a reason
   ("traders read parties as legal jargon") they did not give. If they give
   none and you cannot ask, leave `--why` out: the brief then shows a
   placeholder the designer fills in, which is honest.
6. Ask whether all of the release's changes go, or only some. Some pages
   means `--features <feature folders>` (the folder names under
   `journeys/linear/features/`). Only the latest change means
   `--since <commit>`, the commit before it (for a release whose first commit
   only copied the journey, `--since` that commit hands off everything after
   the copy). Default: everything (`--all`).

Then choose the route:

- **Route 1, from the release (default)**: the team gets the brief and a patch
  to apply. Nothing in the real journey changes here.
- **Route 2, upstream-bound**: choose it when the designer or a developer asks
  for the change to be proven against the real service's own tests, or says
  "prepare it properly for the developers". It builds the change into
  high-risk-plants on a `handoff/<slug>` branch, updates the tests, runs them,
  and writes the folder there.

## Route 1: from a design release

1. So the brief can say whether the patch still fits plants-frontend itself,
   fetch it first (read only; nothing is sent):

   ```
   git fetch upstream main
   ```

   If it fails (no network, no access), carry on: the brief then says it was
   not checked against plants-frontend.

   Dry run, to see which pages change and what stands in the way:

   ```
   npm run designer:handoff -- --set <set-id> --slug <slug> --all --dry-run
   ```

   Read `.cache/designer/handoff/<yyyy-mm-dd>-<slug>/report.json` and
   `brief.md`. Note the page slugs in `pages[].slugs`.

   If it says there is nothing to hand over, go back to step 4 above.

2. Photograph those pages beside the real journey:

   ```
   npm run designer:show -- --set <set-id> --pages <slug,slug> --compare high-risk-plants
   ```

   (Add `--errors` when error messages changed.) A change across the journey
   (a section caption, the task list, flow) has no page slugs in the report:
   picture the pages the words are on (`designer:words -- find` lists them).
   The brief then takes every picture in the gallery for that part.

3. Write the hand-off folder:

   ```
   npm run designer:handoff -- --set <set-id> --slug <slug> --all --title "<short heading>" --why "<what and why>"
   ```

   Use `--features <a,b>` or `--since <commit>` in place of `--all` for only
   some of the change, and `--recipe <name>` for a recipe the commit messages
   do not name. The brief's "Welsh needed" tables show the Welsh each marker
   replaced, for the translator. Its file paths are the real service's paths
   once the patch is applied: a file may not exist in the real journey yet.

4. Read `handoffs/<yyyy-mm-dd>-<slug>/brief.md` in full. Look at the
   screenshots it links. Tell the designer, in plain words:
   - the pages and words that change,
   - how many Welsh strings still need translating,
   - which tests still expect the old words (the team updates these),
   - which requirement files under the real journey's `spec/` folder still
     quote the old words ("Spec and requirement files that quote the old
     words": the journey spec, decisions, panel rulings, backlog extras),
   - what cannot ship as it is, and why. A file that uses a prototype-only
     service is left out of the patch, and so is every file that imports it
     ("Imports …, which is left out"). Say plainly that the patch applies but
     that part of the change only works once the real team builds the
     service,
   - whether the patch applies cleanly, to the prototype's copy of the real
     journey and, when `upstream/main` has been fetched, to plants-frontend
     itself (the brief says which). If it does not, the real journey has
     moved on in the same place since the release was made: the "Has the real
     journey moved on?" section names the files. Say the team will merge those
     by hand, or offer to start a fresh release and carry the change across
     (`design-release`).
     If the "What and why" section still says "[Say what this change is...]",
     write it in `brief.md` and `brief.jira.txt` now.
5. Save the folder on the designer's branch:

   ```
   npm run designer:format
   ```

   ```
   git add handoffs/<yyyy-mm-dd>-<slug>
   ```

   ```
   npm run designer:save -- -m "Hand-off brief: <title>"
   ```

   The checks run first; it prints one line when the save worked, or the end
   of the log when it did not.

6. Explain the two ways it reaches the real service:
   - **The team takes the brief and patch.** Share the `brief.md` link (in the
     designer's pull request, once it is on GitHub) or paste `brief.jira.txt`
     into a Jira story with `upstream.patch` and the screenshots attached.
   - **A developer applies the patch** in their own clone of
     trade-imports-plants-frontend: `git apply --3way upstream.patch`, update
     the tests the brief lists, run `npm test`, and raise the pull request
     there. The file paths are the same in both repositories.
     Ask before sending the branch to GitHub (`share-my-change`, step 6).

## Route 2: upstream-bound

Launch the workflow by its path (never by name):

```
Workflow({ scriptPath: ".claude/workflows/prepare-handoff.js", args: { set: "<set-id>", slug: "<slug>", scope: "all", paths: null, includeDesignGaps: true } })
```

Every key is required; there are no defaults.

- `scope`: `"all"`, or a list of feature folder names, for example
  `["arrival-details"]`.
- `paths`: `null` for everything in scope, or a list of release file paths to
  limit the hand-off to.
- `includeDesignGaps`: `true` to list the release's `design-gaps.md` rows in
  the brief.

What it does, in order:

1. **Dry run** (`runner`): records the designer's branch, stops if anything
   is unsaved or `handoff/<slug>` exists, and runs `designer:handoff --dry-run`.
2. **Triage** (`judge`): sorts every change into upstream-ready, needs a real
   service, design gap, or research only.
3. **Apply** (`builder`): `git switch -c handoff/<slug> main`, applies only the
   upstream-ready part to high-risk-plants with `git apply --3way`, and
   updates the tests, captions and browser tests that pin the old words.
4. **Verify** (`runner`): `npm test`, `npm run lint`,
   `npm run test:fit:features`. A `builder` repairs failures, at most 3 times.
   If they still fail, the work is stashed, the designer's branch is back, and
   it stops with the reason.
5. **Show** (`runner`):
   `npm run designer:show -- --set high-risk-plants --pages changed --before`.
6. **Write** (`builder`):
   `npm run designer:handoff -- --set high-risk-plants --base main --slug <slug> ...`,
   then two commits on `handoff/<slug>`: the change, then the folder.
7. **Return** (`runner`): switches back to the designer's branch.

Afterwards, read the folder on the handoff branch
(`git show handoff/<slug>:handoffs/<folder>/brief.md`), tell the designer
what went, what was parked and why, and explain the two landings above. The
handoff branch stays local until they ask to send it to GitHub (ask first).
It is never merged into the prototype's `main`.

### Route 2 without the Workflow tool

Do the same steps yourself, one after another, stopping at the first
failure: the dry run; decide each file's category with the designer; then

```
git switch -c handoff/<slug> main
```

```
git apply --3way --include=<real-journey path> .cache/designer/handoff/<folder>/upstream.patch
```

update the pinned tests the dry run's `report.json` lists under
`testImpact`; run `npm test`, `npm run lint` and `npm run test:fit:features`
(fix at most 3 times, else
`git stash push --include-untracked -m "prepare-handoff <slug>: checks failing"`
and switch back); run
`npm run designer:show -- --set high-risk-plants --pages changed --before`;
run `npm run designer:handoff -- --set high-risk-plants --base main --slug <slug> --title "<title>" --why "<why>"`;
`npm run designer:format`; commit the change and the folder separately
(stage by name, then `npm run designer:save -- -m "<message>"`); then
`git switch <the designer's branch>`.

## Verify

1. `upstream.patch` applies: the brief's "How to apply" section says "applies
   cleanly", or you have told the designer why not.
2. `brief.md` and `brief.jira.txt` both exist and the "What and why" section is
   filled in.
3. The brief's "Welsh needed" and "Tests that pin the old words" sections match
   what you told the designer.
4. The screenshots folder is under 2 MB (the script keeps it there and lists
   anything it left out).
5. `git status --porcelain` prints nothing, and you are back on the
   designer's branch.

## Hand-off note

This skill is the hand-off. Finish with: "Nothing has been sent to the real
team yet. Share the brief with them, or ask a developer to apply the patch in
plants-frontend. When they merge it, the weekly update brings it back into
this prototype, and your design release can be retired or refreshed."

## Without the designer scripts

If `npm run designer:handoff` is not in `package.json` yet, run the same
script directly: `node scripts/designer/handoff/cli.js --set <set-id> ...`
with the same options. Every option is listed at the top of
`scripts/designer/handoff/cli.js`.
