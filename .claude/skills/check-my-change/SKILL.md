---
name: check-my-change
description: 'Check a designer''s change and explain the result in plain English: runs designer:check at the right level (quick for words and templates, full for flow and model changes and before saving, walk before research), translates every failure into what happened, how to fix it and which skill fixes it, repairs the designer''s own files at most 3 times, and says plainly when a failure is not caused by their change. A green full check is exactly what the pre-commit hook runs, so the next commit passes first time. Use when a designer says "check my changes", "did I break anything", "is it ready", "is it safe to save", "why won''t it start", "why is the prototype broken", "the tests are failing" or "what does this error mean". NOT for making design changes (use change-the-words, match-the-design, change-the-journey, example-data, fake-a-service or design-release), for screenshots (use show-my-change), for starting the prototype (use run-the-prototype) or for saving and sharing (use share-my-change).'
---

# Check my change

You are helping an interaction or content designer find out whether their
change broke anything. They know HTML, Nunjucks and the GOV.UK Design System.
They are not JavaScript developers. Reply in GDS plain English: short
sentences, active voice, no jargon without a plain explanation.

Say "your design release", not "set". Say "the check", not "the pipeline".

## What the check is

`npm run designer:check -- --set <set-id> [--quick|--full|--walk] [--json]`
runs, in order:

| Level               | Steps                                                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--quick` (default) | Tidy the changed files (Prettier), whose files they are (a frozen release changed after its freeze fails here), English and Welsh copy shape, every template compiles, the code rules (ESLint) on every changed `.js` file, every page opens (`src/server/prototype-checks`) |
| `--full`            | Quick, then `npm run format:check`, `npm run lint` and `npm test`: exactly what `.husky/pre-commit` runs (`npm run git:pre-commit-hook`)                                                                                                                                     |
| `--walk`            | Full, then `npm run test:fit:journeys`: every journey walked in a real browser. It includes the full check, so never run `--full` and then `--walk`: run `--walk` alone                                                                                                      |

It prints a pass or fail table, then "What went wrong" with each failure's
cause, fix and fixing skill, then the path of the full log under
`.cache/designer/check/`. The only files it changes are the changed files it
tidies with Prettier, which it names.

Every error it can explain is listed in `docs/designers/checks-and-errors.md`,
with the same headings the check prints. Read that file when you need more
than the check printed.

## Guard rails

Read these before every run.

- **This skill checks. It does not design.** If a fix needs a design decision
  (new words, a new question, a different layout), stop and offer the skill
  that makes that change.
- **Only repair files the designer owns.** Before editing any file, run
  `npm run designer:where -- <path>`. Repair only files it calls "Yours". A
  file that "Belongs to the real service" is never edited on a `design/*`
  branch: explain, and offer "do it in your design release" or "prepare it for
  the real team" (`hand-off`). The list the weekly update follows is
  `overrides.json`: anything not in its `ours` list belongs to the real
  service.
- **Never edit a frozen release.** Offer a working copy (`design-release`).
- **Never weaken a test to make it pass.** Never delete, skip or loosen a
  test, and never change the real journey's tests to match a design change.
- **Never hide a failure.** A failure marked "Not caused by your change: tell
  the maintainer" is reported as it is. Do not try to fix it.
- **One Bash command per call.** Never `--no-verify`, never `npm install`
  (install only with `npx --yes npm@11.6.2 ci`), never push, never commit
  (`share-my-change` commits).
- **At most 3 repairs**, then stop and explain (step 6).

## Step 1: Find the set

Use the set the designer named. If they did not name one, leave out `--set`:
the check picks the working release changed most recently and names it on its
first line. If that is not the one they meant, run again with `--set`.

If the check says "Say which set to check", there is no working release. Ask
which set. (A change skill makes the release itself before any change, so
this only happens when nothing has been changed yet.)

## Step 2: Choose the level

Run:

```bash
git status
```

Then choose:

| The designer changed or asked                                                                  | Level     |
| ---------------------------------------------------------------------------------------------- | --------- |
| Only copy files (`copy/copy.en.js`, `copy/copy.cy.js`), templates (`.njk`) or notes (`.md`)    | `--quick` |
| Anything else: `flow.js`, a controller, `obligations/`, a fixture, a routes file, a new folder | `--full`  |
| "Is it ready", "is it safe to save", "before I share it", or they are about to commit          | `--full`  |
| "Walk it through", before a research session or a show and tell                                | `--walk`  |
| "Why won't it start", "what does this error mean" with no change in mind                       | `--quick` |

If a quick check ends with a "Next:" line, the change needs the full check:
run it before saying the work is ready.

## Step 3: Run the check

```bash
npm run designer:check -- --set <set-id> --quick
```

(or `--full` or `--walk`). The full check takes several minutes because it
builds the styles and runs every test. Tell the designer that before you
start it.

If npm says `Missing script: "designer:check"`, the designer tools are not set
up on this branch. Say so, and tell the designer to ask the maintainer.

## Step 4: Report a pass

Say it in one or two lines, then give the detail that matters:

- Which level passed. For `--full`: "A commit made now will pass the
  pre-commit hook."
- Files tidied, by name.
- The Welsh still needed: the count, and the list if it is short.
- Any row marked "Check" (whose files you changed): read its lines and explain
  them. "Belongs to the real service" is the important one: the weekly update
  will clash with that edit. Offer to move it into their design release or to
  `hand-off`.

## Step 5: Explain a failure

For each item under "What went wrong", in order:

1. Say what happened, in the check's words or simpler ones.
2. Say how to fix it, naming the file and line. A broken code rule lists each
   error under "Where" as `file:line rule: message`; read the log file the
   check named only if that is not enough.
3. Name the skill that fixes it and offer it: "Say 'fix it' and I will", or
   "This needs `change-the-journey`: say 'use change-the-journey' to go on".
4. If it is marked "Not caused by your change: tell the maintainer", say
   exactly that. Explain that it still has to be fixed before anything can be
   saved, and that the maintainer fixes it. Do not repair it.

**A save that failed.** `npm run designer:save` prints "Nothing was saved"
and the last 60 lines of `.cache/designer/commit.log`: the pre-commit hook's
own output (`format:check`, `lint`, `npm test`). Read those lines the same
way. The quickest route to a plain explanation is to run
`npm run designer:check -- --set <release> --full`, which runs the same
checks and translates each failure. A failing test under `scripts/` or
`src/server/prototype-*` is not caused by a design change: it is the
maintainer's, as above.

When the designer pastes an error and asks "what does this error mean", find
the matching heading in `docs/designers/checks-and-errors.md` and explain it
the same way. If none matches, say what the first error line means in plain
words and which file it names.

"Why won't it start" usually means the server refuses to boot. The quick
check's "Pages open" step boots it in the background and explains the boot
error. If the problem is the port or the browser ("The port is already in
use", "The test browser is not installed"), hand over to `run-the-prototype`.

## Step 6: Repair, at most 3 times

Repair only when the designer asks ("fix it", "yes") or when the fix is
mechanical and inside their own release:

- Code layout: run the check again. Its first step tidies the files.
- A missing or empty Welsh key: add `'[Welsh needed] <the English>'` at the
  same key in `copy.cy.js`.
- A template typing slip or a misspelt include path in their release.
- An example that stopped at a page after the designer changed a required
  question: follow `example-data`.
- A code rule in the designer's own release file, such as
  `sonarjs/no-duplicate-string` (a repeated piece of text: use the short
  `fixture: 'name'` form in a scenario file, or a `const` for the text) or
  `sonarjs/cognitive-complexity` and `cyclomatic-complexity` (the function is
  too long: move the code you added into a small helper function in the same
  file, and call it). Never add an `eslint-disable` comment.

For anything else, follow the fixing skill named in the finding.

After each repair, run the same level again. Count the attempts. After the
third failed attempt, stop. Tell the designer:

- what still fails, in plain words
- what you tried
- the skill or person that can take it from here
- that they can throw away the attempt ("say 'throw away what I just did'",
  which `share-my-change` does)

## Step 7: Verify

The check is done when the last run you made is green at the level step 2
chose, or when you stopped at step 6 and explained why. Never say "it passes"
from an earlier run, or from a lower level than the change needs.

## Step 8: Show it and hand off

When the check passes, show the change:

```bash
npm run designer:show -- --set <set-id> --pages changed --before
```

(For a words change, name the pages instead of `changed`: the change skill's
report lists them.)

Give the designer the gallery path it prints and the page links, for example
`http://localhost:3103/<set-id>`. Read the key screenshots yourself before
describing them. Never claim a page looks right without looking.

Then say, if they have not saved yet: "Say 'save my work' and I will commit
it." (`share-my-change`).

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

## References

- `docs/designers/checks-and-errors.md`: the levels, the pre-commit hook and
  every error with its fix
- `scripts/designer/check/translate.js`: the table of failure signatures
- `src/server/prototype-checks/`: the copy-shape and release-render tests that
  run inside `npm test`
- `docs/designers/where-changes-go.md`: whose files are whose
