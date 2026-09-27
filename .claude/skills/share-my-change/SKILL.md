---
name: share-my-change
description: Save, share or undo a designer's change in the plants prototype without the designer needing git - summarise what changed in plain words, put it on a design/<set>-<slug> branch, format and check it, save it as one commit with a message written from the change (pages named, Welsh needed flagged), and, only when asked, send it to GitHub and open a pull request; or safely undo unsaved edits, the last saved change or a named change with a new undo commit. Use when the designer says "save my work", "share this", "commit", "commit this", "make a pull request", "open a PR", "publish", "undo my last change", "undo that", "throw away what I just did", "go back" or "go back to how it was". NOT for making a change (use change-the-words, match-the-design, change-the-journey, example-data, fake-a-service or design-release), NOT for checking a change on its own (use check-my-change), and NOT for sending a change to the real plants-frontend team (use hand-off).
---

# Share my change

Two jobs for a designer who uses git lightly:

- **Share**: save their change as one well-described commit on their own
  branch, and open a pull request when they ask.
- **Undo**: take back unsaved edits, the last saved change, or a named
  change, always by adding a new commit, never by rewriting history.

Talk to the designer in GDS plain English. Say "save" (not "commit"), "your
branch", "your design release", "send it to GitHub" (not "push"). Name the
pages that changed and give links.

## Guard rails

- **One Bash command per call.** No `&&`, `;` or pipes.
- **Never `git add -A` or `git add .`** Stage each file by name.
- **Never `--no-verify`.** The checks that run before every save
  (`npm run git:pre-commit-hook`: `format:check`, `lint`, `npm test`) must
  pass.
- **Never `git reset --hard`, `git rebase`, `git commit --amend`,
  `git push --force` or `git clean`.** Undo always adds a new commit.
- **Never push or open a pull request without asking first**, in words, every
  time. Pull requests go to the prototype repository only
  (`DEFRA/trade-imports-plants-prototype`), never to plants-frontend.
- **Check ownership before saving.** Run `npm run designer:where` and follow
  it. On a `design/*` branch, never save a file that "belongs to the real
  service" or is "removed", and never save a change inside a frozen release.
  Check `overrides.json` if in doubt: only files matching its `ours` list are
  the prototype's own. On `handoff/*` and `maintain/*` branches every file may
  be saved.
- **Never edit `.claude/settings.json`, `.claude/settings.local.json` or
  anything under `.claude/hooks/`.**

## Share

### 1. Find out what changed

1. Run `git branch --show-current`.
2. Run `git status --porcelain`. If it prints nothing, say "There is nothing
   new to save." and stop.
3. Run `git diff` (and read any new files `git status` lists with `??`).
4. Run `npm run designer:where -- --changed`.
5. Work out the design release: the `src/server/app/sets/<set-id>/` folder the
   changes are in. If the changes are in more than one set, ask which to save
   first and save one set per commit.

Tell the designer, in two to five short lines, what changed: which pages,
which words, which layout, which examples. For example: "You renamed
'Consignment parties' to 'Consignment addresses' on 6 pages of plants-working.
The Welsh still says [Welsh needed]."

### 2. Stop on anything that is not theirs

Use the `designer:where` answers:

- **Yours**: fine.
- **Shared with the real service and changed on purpose**: ask whether the
  change is meant. If it is, it needs a `why` in `overrides.json` (the
  maintainer's job): say so and leave the file unsaved.
- **Belongs to the real service** or **Removed** (on a `design/*` branch or
  `main`): do not save it. Say which file, and offer to move the change into
  the design release, or to hand it to the real team (`hand-off`). If the
  designer does not want it, offer "Undo: unsaved edits" below.
- **Frozen release**: do not save it. Offer to start a working release from
  it (`design-release`) and carry the change there.

Files under `.cache/`, `coverage/` and `node_modules/` are never saved (git
ignores them).

### 3. Get onto the designer's own branch

- On `main` (or any branch that is not `design/*`, `handoff/*` or
  `maintain/*`): make a new branch named `design/<set-id>-<slug>`, where
  `<slug>` is two to four words for the change, in lower case with hyphens:

  ```
  git switch -c design/plants-working-consignment-addresses
  ```

  Unsaved changes come with it. Tell the designer the branch name.

- On a `design/*` branch already: stay on it. One branch can hold several
  saved changes.
- On a `handoff/*` branch: this is the upstream route. Save as below; the
  `hand-off` skill says what comes next.

### 4. Format and check

1. Run `npm run format`. Then run `git status --porcelain` again: if format
   changed files that were not in step 1's list, do not save them, and
   mention them as "tidied by the formatter, not part of your change".
2. Run `npm run designer:check -- --set <set-id> --full`. This runs the same
   checks as the save itself, so a save after a green result passes first
   time. If it fails, explain each failure in plain words and fix it with the
   skill `check-my-change` names (at most 3 attempts), then check again. Never
   save on a failing check.

### 5. Save it

1. Stage each file from step 1 that passed step 2, one `git add` per path:

   ```
   git add src/server/app/sets/plants-working/journeys/linear/flow/section-captions/copy/copy.en.js
   ```

2. Write the message from the change, following
   [references/commit-message.md](references/commit-message.md). The first
   line names the release, what changed and on how many pages, and ends
   `; Welsh needed` when a `copy.cy.js` in the change has a `[Welsh needed]`
   marker. For example:

   ```
   plants-working: rename 'Consignment parties' to 'Consignment addresses' on 6 pages; Welsh needed
   ```

3. Save it (the second `-m` is the body: pages, recipe used, design gaps):

   ```
   git commit -m "<first line>" -m "<body>"
   ```

   The pre-commit checks run and take a few minutes. If they fail, nothing was
   saved: read the error, fix it, stage the fix, and run the same `git commit`
   again. Never add `--no-verify`.

4. Run `git log -1 --stat` and tell the designer what was saved, in one
   sentence.

### 6. Send it to GitHub and open a pull request (only when asked)

Ask: "Shall I send this to GitHub and open a pull request so others can see
it?" Only on a clear yes:

1. `git push -u origin <branch>`
2. Write the pull request body to `.cache/designer/share/pr-body.md` from
   [references/pr-body.md](references/pr-body.md). Fill every section from
   real output: the release's purpose from
   `src/server/app/sets/<set-id>/release.json` (or `npm run designer:release -- list`),
   the gallery from `.cache/designer/show/<set-id>/latest/manifest.json` (run
   `show-my-change` first if there is none), the ownership answers from
   step 1, the Welsh markers
   (`grep -rn "\[Welsh needed\]" src/server/app/sets/<set-id>`), and the rows
   of `src/server/app/sets/<set-id>/design-gaps.md`.
3. Open the pull request against the prototype, never plants-frontend:

   ```
   gh pr create --repo DEFRA/trade-imports-plants-prototype --base main --head <branch> --title "<first line>" --body-file .cache/designer/share/pr-body.md
   ```

4. Give the designer the pull request link, and say: "The deployed prototype
   only changes after this is merged to `main`. The pull request's checks
   include a browser test run; its `frontend-playwright-report` download has a
   video walking through each design release."

## Undo

Ask which of these three the designer means, unless it is obvious. Always
list exactly what will be undone and get a yes before doing it.

### Unsaved edits ("throw away what I just did")

1. Run `git status --porcelain` and list the changed files in plain words
   (page and what kind of file).
2. Ask which to throw away: all of them, or named ones.
3. For each changed file they named (status `M` or `D`), one command per
   file. If it is staged (a letter in the first column), unstage it first:

   ```
   git restore --staged <path>
   ```

   ```
   git restore <path>
   ```

4. For a new file (status `??`), do not delete it. Put it aside so it can come
   back:

   ```
   git stash push --include-untracked -m "put aside by undo: <what it was>" -- <path>
   ```

   Tell the designer it is kept and can come back if they ask
   ("bring back what I put aside": `git stash list`, then
   `git stash pop stash@{<n>}` for the matching one).

### The last saved change ("undo my last change", "go back")

1. Run `git status --porcelain`. If it lists anything, ask whether to save it
   or throw it away first. Undo needs a clean start.
2. Run `git log -1 --format="%h %s"` and tell the designer what that change
   was.
3. If it is a merge (the weekly update, or a merged pull request), or a
   `Research mode on for <set-id>` commit, stop. A merge is the maintainer's
   to undo. Research mode has its own off switch:
   `npm run designer:research -- off <set-id>` (`research-session`).
4. On a yes:

   ```
   git revert --no-edit HEAD
   ```

5. Run `git status --porcelain` (it must print nothing) and
   `git log -2 --oneline` (the newest line starts `Revert`).

### A named change ("undo the confirmation panel change")

1. Find it by its message:

   ```
   git log --oneline -20 -i --grep "<a word from the change>"
   ```

   Or list the release's recent changes:

   ```
   git log --oneline -20 -- src/server/app/sets/<set-id>
   ```

2. Show the candidates in plain words and ask which one. Never guess.
3. With a clean `git status`, on a yes:

   ```
   git revert --no-edit <commit>
   ```

4. If git reports a conflict, a later change touched the same lines. Run
   `git revert --abort` (this puts everything back as it was), explain that,
   and offer to undo the later change first or to make the change back by
   hand.

The undo commit is saved on the designer's branch like any other change. If
the branch is already on GitHub, offer to send the undo too (ask first).

## Verify

1. `git status --porcelain` prints nothing after a save or an undo (apart from
   anything the designer chose to leave unsaved).
2. `git log -1 --format="%s"` shows the message you wrote, or `Revert "..."`.
3. After an undo, run `npm run designer:check -- --set <set-id>` and
   `npm run designer:show -- --set <set-id> --pages <the pages it touched>`,
   read the key PNGs yourself, and describe what the pages look like now.
   Never claim a visual result you have not looked at.
4. After a pull request, `gh pr view --repo DEFRA/trade-imports-plants-prototype <branch>`
   shows it open against `main`.

## Hand-off

End every share and every undo with: "If this should become part of the real
service, say 'hand this to the real team' and I will prepare a brief and a
patch for the plants-frontend team."

## Without the designer scripts

If `npm run designer:where` or `designer:check` is not in `package.json` yet,
run `node scripts/designer/where/cli.js --changed` for the ownership answers,
and `npm run lint` then `npm test` in place of the full check.
