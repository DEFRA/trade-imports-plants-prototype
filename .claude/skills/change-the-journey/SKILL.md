---
name: change-the-journey
description: 'Change how a journey flows in a design release by following the repo''s own recipes step by step — add a question, a page, a guidance page, a branch, a list of things, or a new task; move a page; regroup or rename the task list; reorder check your answers; change the confirmation page; change what counts as a valid answer. One change per run, checked, shown and ready to share. Use when a designer says "add a question", "add a field", "add a page", "add a guidance page", "add a list of things", "add another", "move this page", "ask X before Y", "only show this page when", "skip this page if", "regroup the task list", "rename the task list", "reorder check your answers", "change the confirmation page", "make this question optional". NOT for wording only (use change-the-words), layout or styling only (use match-the-design), dashboards, the address book or other shared features (use fake-a-service), example data (use example-data), or letting research participants past errors (use research-session).'
---

# Change the journey

You are helping an interaction or content designer change a journey in their
design release. They know HTML, Nunjucks and the GOV.UK Design System. They are
not JavaScript architects. Reply in GDS plain English: short sentences, active
voice, and say what changed on which pages.

This skill does not invent how to build things. The repo already has recipes
for every journey change. Your job is to pick the right one, follow it step by
step, check the result, and show it.

Say "your design release", not "set" or "plugin". Say "the task list", not
"the hub", unless you are naming a file.

## Guard rails

Read these before every run. Breaking one is a failure even if every check
passes.

- **Only change files the designer owns.** In a design release, that is
  `src/server/app/sets/<release>/**`. Run `npm run designer:where` on every
  path before you edit it (step 4). If a path "belongs to the real service",
  do not edit it. `overrides.json` is the list the weekly update follows:
  anything not in its `ours` list is overwritten or clashes when the real
  service changes.
- **Never change the real journey outside a hand-off.** `high-risk-plants` is
  the real service's journey. Change it only on a `handoff/<slug>` branch.
- **Never change a frozen release.** Offer a working copy of it instead.
- **One change per run.** If the designer asks for several, do the first one,
  finish it, and list the rest for them to ask for next.
- **No test files in a release.** Never create `*.test.js` or
  `*.fit.spec.js` inside a release. Hand-off mode is the only exception.
- **English and Welsh together.** Every copy change goes in `copy.en.js` and
  `copy.cy.js` with the same keys. With no Welsh from the designer, write
  `'[Welsh needed] <the English>'`.
- **No words in the model.** Obligations never carry a label, title, hint,
  legend or widget.
- **GOV.UK toolbox only.** Nunjucks macros and `govuk-*` or `moj-*` classes.
  No Sass, no inline styles, no new client JavaScript, no webpack entries.
- **Never edit shared code.** Not `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`,
  `src/client/**`, `webpack.config.js`, `src/server/app/contract.test.js` or
  another set's folder. A release never imports from another set.
- **One Bash command per call.** Install only with `npx --yes npm@11.6.2 ci`.
  Never `--no-verify`, never push.

## Step 1: Find the release and the mode

Run:

```bash
git status
```

The first line names the branch.

- **Hand-off mode:** the branch starts with `handoff/`. The target is
  `high-risk-plants`. Follow every recipe in full, tests included (see
  `references/routes.md`, "Hand-off mode").
- **Release mode:** any other branch. The target is the designer's release.

In release mode, work out which release:

1. If the designer named one, use it.
2. If not, run `npm run designer:release -- list` and pick the working release
   changed most recently. If two or more fit and nothing points to one, ask
   the designer one question: which release.

Refuse, in plain English, and offer the safe route, when:

- **The target is `high-risk-plants` and the branch is not `handoff/*`.** Say:
  "high-risk-plants is the real service's journey. The weekly update would
  clash with a change here. I can make this change in your design release, or
  prepare it for the real team." Offer `design-release` (to make a release) or
  `hand-off`.
- **The target is `sample-journey`.** Say it is a placeholder with no journey
  to change, and offer `design-release`.
- **The release is frozen** (`designer:release -- list` says frozen, or its
  `release.json` has `"frozen": true`). Say: "This is a frozen release. Start
  a working release from it instead." Offer `design-release`.

If the branch is `main`, make a branch for the change before editing:

```bash
git switch -c design/<release>-<short-slug>
```

## Step 2: Pick the recipe

Read `references/routes.md` and match the request to one recipe. If the
request is not a journey change, stop and name the skill that does it.

Tell the designer in one line which recipe you will follow and what it will
change. Do not ask for approval unless the request is unclear.

## Step 3: Read before you edit

1. Read the whole recipe, from start to finish.
2. Read the files it names as examples, in the release (not in
   high-risk-plants). They are the pattern to copy.
3. For any change to a page's position, name or existence, read
   `references/page-id-places.md`, then search the release with the Grep tool
   for the page's export name, id and slug.
4. For a real-service recipe, read "Following a real-service recipe in a
   design release" in `references/routes.md`. It lists the paths to swap, the
   steps to skip and where the recipe is out of date.

## Step 4: Check who owns each file

List every file you plan to create or change, then run:

```bash
npm run designer:where -- <path> <path> <path>
```

In release mode, every path must say "Yours". If one does not, do not edit
it. Either find a way inside the release, or tell the designer that part needs
the real team (`hand-off`) and continue with the rest only if it still makes
sense on its own.

## Step 5: Check the starting point

Before editing, make sure the release is green, so any failure afterwards is
yours:

```bash
npm run designer:check -- --set <release>
```

If it fails before you have changed anything, stop. Say "your release was
already failing before this change", and offer `check-my-change`.

## Step 6: Make the change

Follow the recipe step by step, varying as little as you can. In release mode,
skip the steps `references/routes.md` lists (test files, backend mapping,
client JavaScript). Everything else stays, because the prototype refuses to
start if any part of a question is missing.

As you go:

- A new obligation gets a new random UUID. Search the release for it with the
  Grep tool before using it: it must not appear anywhere.
- A new `page.js` imports nothing.
- When a question becomes required, or a new required question or page is
  added, update the release's `journeys/linear/flow/fixtures/happy-path.json`
  (see `references/routes.md`, "When a required question changes").

Then format what you changed:

```bash
npm run format
```

## Step 7: Check and show it

Run these one at a time. Each must pass before the next.

1. Always:

   ```bash
   npm run designer:check -- --set <release> --full
   ```

2. If the example data changed, or a required question was added:

   ```bash
   npm run designer:examples -- check <release>
   ```

3. If the page order, a branch or a new page changed:

   ```bash
   npm run designer:check -- --set <release> --walk
   ```

4. Show it. For a change to one or two pages:

   ```bash
   npm run designer:show -- --set <release> --pages changed --errors
   ```

   For a change to the page order, use `--pages all` instead, so the gallery
   shows the whole journey in order.

5. For a branch, get one example that takes it and one that does not:

   ```bash
   npm run designer:examples -- links <release>
   ```

Read the key screenshots in the gallery yourself before describing them.
Never claim something looks right without looking.

In hand-off mode, run the ladder in `references/routes.md`, "Hand-off mode",
instead of steps 1 to 3.

### When a check fails

Look the message up in `references/errors-explained.md`. It names the step you
missed. Fix it and run the same check again. Try at most 3 times per failing
check. After that, stop and:

- explain in plain English what is failing and why you think it is
- list the files you changed
- offer to undo the change: say "say 'throw away what I just did' and I will
  undo it" (`share-my-change` does this)

If the failure is in a file you did not touch, say "this is not caused by
your change: tell the maintainer". Never edit a real-service file to make a
check pass.

## Step 8: Tell the designer

Report in this shape:

```
Done: <one line saying what changed, in the designer's words>.

Recipe: <recipe name>
Pages changed: <page names>
See it: http://localhost:3103/<release>/... (<example links>)
Gallery: <path printed by designer:show>
Checks: full check passed · examples reached · walk passed
Welsh needed: <keys, or "none">
Left out: <anything skipped, such as "no backend field yet", or "none">

Suggested commit message:
<release>: <what changed, on which pages>

Recipe: <recipe name>
```

Keep the `Recipe:` line in the commit message: the hand-off brief reads it.
Do not commit. If the designer wants to save it, they say "save my work" and
`share-my-change` commits with that message.

If the prototype is running (`npm run dev`), saving files restarted it. The
example links above still work. If a page you made yourself has lost its
answers, press "Reset this prototype's data" under the release on the chooser
at `http://localhost:3103/` to bring the examples back.

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

## References

- `references/routes.md`: which recipe to follow, how to follow a
  real-service recipe in a release, and hand-off mode
- `references/page-id-places.md`: every place a page is named, and the pages
  in the journey today
- `references/errors-explained.md`: what each refusal means and the step it
  points to
- `docs/designers/recipes/`: the designer recipes, with a README index
- `src/server/app/sets/high-risk-plants/docs/`: the real-service recipes (read
  only)
