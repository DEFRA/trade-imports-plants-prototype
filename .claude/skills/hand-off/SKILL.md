---
name: hand-off
description: Prepare a designer's change in the plants prototype for the real plants-frontend team as a story a developer or an agent can build from - an EUDPA story ready to paste into Jira (As, I want, So that in the designer's own words, acceptance criteria as Given, When, Then, a Tech Notes panel), how to see the prototype running, the journey flow before and after, every validation rule with its English and Welsh error, the contract of any new service to build, the tests to add, before-and-after screenshots and an upstream.patch checked with git apply --check. Route 1 (default) writes the hand-off folder from a design release (brief only, with no patch, for a release made from sample-journey or a pure concept); route 2 (upstream-bound) also applies the ready part to high-risk-plants on a handoff/<slug> branch with its tests, via the prepare-handoff workflow. Use when the designer says "hand this to the real team", "send this to the developers", "for the developers", "make this real", "raise this with plants-frontend", "write a brief for the developers", "a ticket for the devs", "write it up as a story", "raise a Jira", "put it in the backlog" or "prepare this for the real service". NOT for saving or sharing work in the prototype (use share-my-change), NOT for making the change itself (use the change skills), and NOT for pushing anything to plants-frontend (nothing ever is).
---

# Hand off

Prepares a change made in a design release so the real plants-frontend team
can build it: a folder `handoffs/<yyyy-mm-dd>-<slug>/` with

- `brief.jira.txt`: the story in Jira wiki markup, ready to paste. It starts
  with the story itself: the summary, _As_, _I want_ and _So that_, the
  description, the acceptance criteria as _Given_, _When_, _Then_, and a
  Tech Notes panel (patch, drift, services, tests, recipe, branch). Then:
  "See the prototype" (links and how to run it locally), "Journey flow"
  (page order before and after, and gate changes), "Validation" (one row per
  rule, with the English and Welsh error), "Service to build" for each new
  service, "Tests to add" and "For the developer or agent". Everything else
  follows under "Detail": each page with screenshots and a table of changed
  words, Welsh needed, tests and spec files that quote the old words, what
  cannot ship as it is, what was left out and why, drift, and how to apply.
- `brief.md`: the same in Markdown, for the repository and a pull request.
- `upstream.patch`: the change as the real team's files, in `git apply`
  format, checked against the real journey. There is none for a brief only.
- `report.json`: the same facts as data, including which story placeholders
  are still to fill in.
- `screenshots/`: at most 2 MB of pictures from `designer:show`.

Talk to the designer in GDS plain English. Say "the real team" or "the
plants-frontend team", "your design release", "the story", "the brief". Never
say "upstream" without explaining it once ("the real service's code").

## Guard rails

- **Never invent the designer's words.** _As_, _I want_, _So that_ and the
  description come only from what the designer said. The acceptance criteria
  are drafted by you but only used once the designer has confirmed them. What
  they did not give stays a placeholder the brief shows in square brackets.
- **Nothing is ever pushed to plants-frontend.** The prototype's tools set
  the `upstream` remote's push address to `DISABLED` on purpose (a fresh
  clone has no `upstream` remote until step 1 of route 1 adds it). Never
  change that, never add any other remote.
- **Never merge a `handoff/*` branch into the prototype's `main`.** Once the
  real team merges the change, Monday's weekly update brings it in.
- **Never edit high-risk-plants on a `design/*` branch or `main`.** Only route
  2 changes it, and only on its own `handoff/<slug>` branch.
- **Check ownership first.** Run `npm run designer:where -- --changed` and
  check `overrides.json`: a hand-off starts from the designer's own saved
  files. A prototype-owned service (a folder under `src/server/app/services/`
  with its own line in `ours`) is the designer's own too.
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

   A **pure concept** (an idea with pages in a release, but nothing the real
   team should apply as it is) and a release made from `sample-journey` are
   handed off as a **brief only**: the story, pictures, links and service
   contracts, with no patch. A release made from `sample-journey` is always
   brief only; for a concept, add `--brief-only`.

5. Agree a slug for the folder, two to four words with hyphens, for example
   `consignment-addresses`.
6. **Ask for the story in the designer's own words**, in one message, unless
   the conversation already says:
   - who it is for (_As_ …), for example "an importer of high-risk plants":
     `--as`
   - what they need to do (_I want_ …): `--want`
   - why they need it (_So that_ …): `--so-that`
   - what the change is and why, in one or two sentences: `--why`

   Use only their words, lightly tidied for grammar. Never make up a user, a
   need or a reason ("traders read parties as legal jargon") they did not
   give. If they give none of it and you cannot ask, leave the options out:
   the story then shows placeholders, which is honest, and the script lists
   them.

7. **Acceptance criteria.** For a change of words only, leave `--criteria`
   out: the script writes one criterion per changed string, and one for the
   Welsh, from the copy files. For anything else, draft them from the change
   (the pages it adds or changes, the fields, each validation rule and its
   error, any flow or gate change), write them to
   `.cache/designer/handoff/<slug>.criteria.txt` (git ignores it), show them
   to the designer and ask them to confirm or change them. Their changes win.
   Use only what the prototype really does. The file format:

   ```
   Scenario: The plants were grown under glass
   Given I am on the reason for import page
   When I choose "Yes" for grown under glass
   Then I go to the arrival details page

   Given I have not answered whether the plants were grown under glass
   When I continue
   Then I see "Select yes if the plants were grown under glass"
   And the error summary links to the question
   ```

   Each criterion is a block of `Given`, `When`, `Then`, `And` or `But`
   lines; a blank line starts the next. `Scenario:` and lines starting `#`
   are optional. Pass it as `--criteria .cache/designer/handoff/<slug>.criteria.txt`.

8. **Links to see it.** If the design branch is already on GitHub, pass
   `--link https://github.com/DEFRA/trade-imports-plants-prototype/tree/<branch>`,
   and `--link <pull request address>` when there is one (`gh pr view --json url`).
   Never push only to get a link: ask first (`share-my-change`, step 6). The
   brief always adds example links for each changed page, the deployed
   prototype's address once `scripts/designer/prototype.json` has a
   `deployedUrl`, and the steps to run it locally.
9. Ask whether all of the release's changes go, or only some. Some pages
   means `--features <feature folders>` (the folder names under
   `journeys/linear/features/`). Only the latest change means
   `--since <commit>`, the commit before it (for a release whose first commit
   only copied the journey, `--since` that commit hands off everything after
   the copy). Default: everything (`--all`).

Then choose the route:

- **Route 1, from the release (default)**: the team gets the story, the brief
  and a patch to apply (or a brief only). Nothing in the real journey changes
  here.
- **Route 2, upstream-bound**: choose it when the designer or a developer asks
  for the change to be proven against the real service's own tests, or says
  "prepare it properly for the developers". It builds the change into
  high-risk-plants on a `handoff/<slug>` branch, updates the tests, runs them,
  and writes the folder there. Not for a brief only.

## Route 1: from a design release

1. So the brief can say whether the patch still fits plants-frontend itself,
   fetch it first (read only; nothing is sent). A fresh `git clone` of the
   prototype has no `upstream` remote, so check for it:

   ```
   git remote get-url upstream
   ```

   If git says there is no such remote, add it, then lock its push address,
   one command per call and without asking (this only lets the prototype
   read plants-frontend):

   ```
   git remote add upstream https://github.com/DEFRA/trade-imports-plants-frontend.git
   ```

   ```
   git remote set-url --push upstream DISABLED
   ```

   Check `git remote get-url --push upstream` prints `DISABLED` whenever the
   remote already existed too; if it does not, run the `set-url --push`
   command above. Then fetch:

   ```
   git fetch upstream main
   ```

   If the fetch fails (no network, or no access to plants-frontend), carry
   on, and tell the designer in one line: the brief will say it was not
   checked against plants-frontend itself, only against the prototype's copy
   of the real journey.

   Dry run, to see which pages change and what stands in the way:

   ```
   npm run designer:handoff -- --set <set-id> --slug <slug> --all --dry-run
   ```

   Read `.cache/designer/handoff/<yyyy-mm-dd>-<slug>/report.json` and
   `brief.md`. Note the page slugs in `pages[].slugs`, the rules in
   `validation` and any `servicesToBuild`: they help you draft the criteria
   (step 7 above).

   If it says there is nothing to hand over, go back to step 4 above.

2. Photograph those pages beside the real journey:

   ```
   npm run designer:show -- --set <set-id> --pages <slug,slug> --compare high-risk-plants
   ```

   (Add `--errors` when error messages or validation changed.) A change
   across the journey (a section caption, the task list, flow) has no page
   slugs in the report: picture the pages the words are on
   (`designer:words -- find` lists them). The brief then takes every picture
   in the gallery for that part.

3. Write the hand-off folder:

   ```
   npm run designer:handoff -- --set <set-id> --slug <slug> --all --title "<short summary>" --why "<what and why>" --as "<who>" --want "<what they need>" --so-that "<why they need it>" --criteria .cache/designer/handoff/<slug>.criteria.txt --link <design branch address>
   ```

   Leave out any option the designer did not give. Use `--features <a,b>` or
   `--since <commit>` in place of `--all` for only some of the change,
   `--recipe <name>` for a recipe the commit messages do not name, and
   `--brief-only` for a pure concept. The script prints what it wrote and
   which story placeholders are left.

4. **Check the story.** Read `handoffs/<yyyy-mm-dd>-<slug>/brief.jira.txt`
   from the top. It must have:
   - a story line (_As_, _I want_, _So that_) that is not a placeholder in
     square brackets, and
   - at least one acceptance criterion that is not a placeholder.

   The script's "Still to fill in" line, and `story.placeholders` in
   `report.json`, name what is left. Tell the designer which placeholders
   remain, in one line, and ask for those words. When they answer, run step 3
   again with them: never type their words into the brief yourself, and never
   fill a placeholder with words of your own.

5. Read `brief.md` in full. Look at the screenshots it links. Tell the
   designer, in plain words:
   - the pages and words that change, and the journey flow (whether the page
     order or a gate changes),
   - the validation rules on the changed pages, and any whose Welsh error
     still says `[Welsh needed]`,
   - any service to build: the patch carries its `index.js` and `client.js`
     as proposed, and the story asks the real team for the backend endpoint
     and a plain `stub.js`; the open questions (which backend owns the data,
     whether the endpoints are right) are for the team to answer, not you,
   - the tests the real team adds ("Tests to add") and the ones that still
     expect the old words,
   - which requirement files still quote the old words (the real journey's
     `spec/` folder and, when the brief found it on this computer, the real
     team's plants behaviour spec, which the brief names by path),
   - what cannot ship as it is, and why. A file that uses the prototype's own
     example data or stub plumbing is left out of the patch, and so is every
     file that imports it ("Imports …, which is left out"),
   - whether the patch applies cleanly, to the prototype's copy of the real
     journey and, when `upstream/main` has been fetched, to plants-frontend
     itself (the brief says which). If it does not, the real journey has
     moved on in the same place since the release was made: the "Has the real
     journey moved on?" section names the files. Say the team will merge those
     by hand, or offer to start a fresh release and carry the change across
     (`design-release`).

6. Save the folder on the designer's branch:

   ```
   npm run designer:format
   ```

   ```
   git add handoffs/<yyyy-mm-dd>-<slug>
   ```

   ```
   npm run designer:save -- -m "Hand-off story: <title>"
   ```

   The checks run first; it prints one line when the save worked, or the end
   of the log when it did not.

7. Explain how it reaches the real service, and who to send it to
   ("Who to send it to" in `handoffs/README.md`):
   - **As a story.** Paste the `*Summary:*` line into Jira's Summary field
     and the rest of `brief.jira.txt` into the description of a new story in
     the EUDPA Jira project, with `upstream.patch` and the screenshots
     attached. A developer, or an agent using the workspace's `ticket` or
     `frontend-change` skill, builds it from there.
   - **A developer applies the patch** in their own clone of
     trade-imports-plants-frontend: `git apply --3way upstream.patch`, write
     the tests the brief lists, run `npm test`, and raise the pull request
     there. The file paths are the same in both repositories.
     Ask before sending the branch to GitHub (`share-my-change`, step 6).

## Route 2: upstream-bound

Launch the workflow by its path (never by name):

```
Workflow({ scriptPath: ".claude/workflows/prepare-handoff.js", args: { set: "<set-id>", slug: "<slug>", scope: "all", paths: null, includeDesignGaps: true, story: { as: "<who>", want: "<what>", soThat: "<why they need it>", why: "<what and why>", criteria: ".cache/designer/handoff/<slug>.criteria.txt", links: [] } } })
```

Every key is required; there are no defaults.

- `scope`: `"all"`, or a list of feature folder names, for example
  `["arrival-details"]`.
- `paths`: `null` for everything in scope, or a list of release file paths to
  limit the hand-off to.
- `includeDesignGaps`: `true` to list the release's `design-gaps.md` rows in
  the brief.
- `story`: the designer's own words from "Before either route", steps 6 to 8.
  Leave out any key they did not give, or pass `null` when they gave none.
  The workflow never writes them for them.

What it does, in order:

1. **Dry run** (`runner`): records the designer's branch, stops if anything
   is unsaved or `handoff/<slug>` exists, and runs `designer:handoff --dry-run`.
2. **Triage** (`judge`): sorts every change into upstream-ready, needs a real
   service, design gap, or research only. A page that uses a prototype-owned
   service is upstream-ready: the service goes with it.
3. **Apply** (`builder`): `git switch -c handoff/<slug> main`, applies only the
   upstream-ready part to high-risk-plants with `git apply --3way`, brings any
   prototype-owned service folder across from the designer's branch when main
   lacks it, and updates the tests, captions and browser tests that pin the
   old words.
4. **Verify** (`runner`): `npm test`, `npm run lint`,
   `npm run test:fit:features`. A `builder` repairs failures, at most 3 times.
   If they still fail, the work is stashed, the designer's branch is back, and
   it stops with the reason.
5. **Show** (`runner`):
   `npm run designer:show -- --set high-risk-plants --pages changed --before`.
6. **Write** (`builder`):
   `npm run designer:handoff -- --set high-risk-plants --base main --slug <slug> ...`
   with the story options, then two commits on `handoff/<slug>`: the change,
   then the folder.
7. **Return** (`runner`): switches back to the designer's branch.

Afterwards, read the folder on the handoff branch
(`git show handoff/<slug>:handoffs/<folder>/brief.jira.txt`), do the story
check (route 1, step 4), tell the designer what went, what was parked and why,
and explain the two landings above. The handoff branch stays local until they
ask to send it to GitHub (ask first). It is never merged into the prototype's
`main`.

### Route 2 without the Workflow tool

Do the same steps yourself, one after another, stopping at the first
failure: the dry run; decide each file's category with the designer; then

```
git switch -c handoff/<slug> main
```

```
git apply --3way --include=<real-journey path> .cache/designer/handoff/<folder>/upstream.patch
```

for each prototype-owned service in the dry run's `report.json`
`servicesToBuild` that `git ls-files src/server/app/services/<name>` does not
list, `git checkout <the designer's branch> -- src/server/app/services/<name>`;
update the pinned tests the dry run's `report.json` lists under
`testImpact`; run `npm test`, `npm run lint` and `npm run test:fit:features`
(fix at most 3 times, else
`git stash push --include-untracked -m "prepare-handoff <slug>: checks failing"`
and switch back); run
`npm run designer:show -- --set high-risk-plants --pages changed --before`;
run `npm run designer:handoff -- --set high-risk-plants --base main --slug <slug> --title "<title>" --why "<why>"`
with the story options;
`npm run designer:format`; commit the change and the folder separately
(stage by name, then `npm run designer:save -- -m "<message>"`); then
`git switch <the designer's branch>`.

## Verify

1. `brief.jira.txt` starts with the story: a `*Summary:*` line, a story line
   that is not a placeholder, and at least one acceptance criterion that is
   not a placeholder. Any placeholder left is one you have named to the
   designer.
2. `upstream.patch` applies: the Tech Notes panel says "applies cleanly", or
   you have told the designer why not. A brief only has no patch, and says
   why.
3. `brief.md` and `brief.jira.txt` both exist.
4. The brief's "Validation", "Welsh needed" and "Tests that pin the old
   words" sections match what you told the designer.
5. The screenshots folder is under 2 MB (the script keeps it there and lists
   anything it left out).
6. `git status --porcelain` prints nothing, and you are back on the
   designer's branch.

## Hand-off note

This skill is the hand-off. Finish with: "Nothing has been sent to the real
team yet. Raise it as a story in the EUDPA Jira project: paste the Summary
line into the Summary field and the rest of `brief.jira.txt` into the
description, and attach the patch and screenshots. Then send the link to the
plants-frontend team's delivery lead or product owner, who decides when it is
built. `handoffs/README.md` says more. When they merge it, the weekly update
brings it back into this prototype, and your design release can be retired or
refreshed."

When the designer later says "I sent it", "it's ticket EUDPA-123" or "it was
merged", add or update the status lines at the top of that hand-off's
`brief.md` (see "Keeping track" in `handoffs/README.md`), then save with
`share-my-change`.

## Without the designer scripts

If `npm run designer:handoff` is not in `package.json` yet, run the same
script directly: `node scripts/designer/handoff/cli.js --set <set-id> ...`
with the same options. Every option is listed at the top of
`scripts/designer/handoff/cli.js`.
