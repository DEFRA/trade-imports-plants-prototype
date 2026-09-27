---
name: research-session
description: Get a design release ready for a user research round in the plants prototype - a research release, one stable link per task, errors left realistic or switched off for chosen pages by one revertible "Research mode on" commit, and a printable participant sheet; then switch errors back on afterwards. Use when the designer says "get ready for research", "research session", "user testing next week", "let participants through", "turn errors off", "turn errors on", "switch validation off", "reset between participants" or "print a sheet for the session". NOT for a permanent design change (use change-the-journey, change-the-words or match-the-design in a working release), NOT for new example data on its own (use example-data), and NOT for making a release (use design-release, which this skill calls).
---

# Research session

Gets a design release ready for a round of user research, then puts it back
afterwards. Four things, in this order:

1. a **research release** (a design release made for research),
2. one **stable link** per research task,
3. how **errors** behave: realistic (the default) or switched off on chosen
   pages ("research mode"),
4. a **participant sheet** for the facilitator.

Research mode is one commit titled exactly `Research mode on for <set-id>`. It
relaxes only the save rules the designer chose, and logs each one in
`src/server/app/sets/<set-id>/research-mode.md`. While that file exists, the
chooser shows a "Research mode on" tag. Afterwards
`npm run designer:research -- off <set-id>` reverts the commit, which puts every
rule back and removes the file and the tag.

Talk to the designer in GDS plain English. Say "your research release", not
"set". Say which pages changed and give links.

## Guard rails

- **Never high-risk-plants.** It is the real journey. `designer:research -- on`
  refuses it. If the designer is working there, make a research release first.
- **Never a frozen release.** Start a research release from it instead.
- **Only inside the research release.** Every change stays in
  `src/server/app/sets/<set-id>/`. Before any edit, run
  `npm run designer:where -- <paths>` and follow what it says. Never edit the
  engine, `src/server/app/lib/`, `src/server/app/shared/`, another set, or any
  file `overrides.json` does not list as `ours` - if a request needs one, stop
  and offer `hand-off` instead.
- **Research mode changes save rules only.** Controllers' `fields`, and
  obligations' `status`. No wording, template or flow changes in the same
  commit: make those separately with the usual skills, before or after.
- **One Bash command per call.** No `&&`, `;` or pipes. Never `--no-verify`,
  never `git reset --hard`, never force-push, never push or open a pull request
  without asking.
- **Never write the research-mode commit by hand.** Always use
  `npm run designer:research -- on <set-id>`, so the title is exact and `off`
  can find it.

## Steps

### 1. Make or pick the research release

1. List the releases:

   ```
   npm run designer:release -- list
   ```

2. If there is a research release for this round, use it. If not, follow the
   `design-release` skill to make one from `high-risk-plants` with purpose
   `research`. Name it `plants-research-<topic>-<yyyymm>`, for example
   `plants-research-arrival-202610`:

   ```
   npm run new:set -- plants-research-arrival-202610 --from high-risk-plants --describe "Research round on arrival dates, October 2026" --purpose research
   ```

   A research release made from a working release uses `--from <that release>`.

### 2. Agree the tasks and give each a stable link

1. Ask the designer for the tasks, in order, and the page each one starts on.
   Keep to what they asked for. If they are unsure, suggest at most 5.
2. For each task that does not start on the dashboard, follow the
   `example-data` skill to add an example **stopped at the task's starting
   page**, with a short example id (for example `arrival-task`). The example
   fills in every earlier page, so the participant starts exactly there.
3. Check every example reaches its page, then print the links:

   ```
   npm run designer:examples -- check <set-id>
   ```

   ```
   npm run designer:examples -- links <set-id>
   ```

   Each link is `/examples/<set-id>/<example-id>`. It keeps working after the
   prototype restarts.

4. Write `src/server/app/sets/<set-id>/research-session.json` with the tasks
   (see [references/session-file.md](references/session-file.md)). Ask once for
   the deployed prototype's address; if nobody knows it, leave `deployedUrl`
   out.
5. Save the examples and the session file with `share-my-change` before going
   on. They are not part of research mode.

### 3. Choose how errors behave

Ask once: "Should participants see errors exactly as the real service shows
them (the default), or should some pages let them through?"

- **Realistic** (default): change nothing. Go to step 4.
- **Let participants through**: agree which pages, and on each page which
  answers may be left blank. Then:

1. Check research mode is not already on:

   ```
   npm run designer:research -- status <set-id>
   ```

   If it is on and the designer wants different pages, turn it off first
   (see "After the sessions").

2. Check `git status` shows nothing else changed in the release. If something
   is, save it or undo it first (`share-my-change`).
3. Relax each chosen rule by following
   [references/relax-a-save-rule.md](references/relax-a-save-rule.md). Swap
   required rules for their blank-allowed twins in the page's `controller.js`.
   If a task goes as far as submitting, also make the same answers `optional`
   in the release's `obligations/sections/*.js`. Tell the designer plainly what
   cannot be relaxed (commodity type, country of origin, commodity lists, check
   your answers' own errors).
4. Write `src/server/app/sets/<set-id>/research-mode.md` from
   [references/research-mode-template.md](references/research-mode-template.md):
   one row per relaxed rule, naming its file.
5. Check the release still works. Fix anything it reports before going on:

   ```
   npm run designer:check -- --set <set-id> --full
   ```

6. Save research mode as its one commit:

   ```
   npm run designer:research -- on <set-id>
   ```

   It refuses high-risk-plants, frozen releases, a changed rule file the log
   does not name, and deletions. It commits only the controllers, obligations
   and `research-mode.md` inside the release, and lists anything it left
   unsaved. The checks that run before every commit run here too, so it takes a
   few minutes.

### 4. Make the participant sheet

```
npm run designer:research -- sheet <set-id>
```

Add `--deployed-url <address>` if the address is not in the session file. It
writes `.cache/designer/research/<set-id>/sheet.html`: the local and deployed
links for each task, how to sign in, the errors switched off, how to Reset, and
a checklist. Read the file and tell the designer what is on it. Give them the
path so they can open or print it.

### 5. Remind the designer before the session

Say both of these, every time:

- "The deployed prototype only changes after your work is merged to `main`.
  Share it and get it merged the day before the session, then open each task
  link on the deployed prototype once."
- "Reset clears this release's data for everyone using the deployed prototype,
  including anyone in another session at the same time. Every participant opens
  the same example notification, so Reset between participants: on the
  prototypes page, under your release, select 'Reset this prototype's data'."

## After the sessions

1. Switch errors back on:

   ```
   npm run designer:research -- off <set-id>
   ```

   It finds the `Research mode on for <set-id>` commit by its title and reverts
   it with a new commit. Every rule comes back, `research-mode.md` goes, and the
   chooser tag disappears. It refuses while the release has unsaved changes.
   If a later change touched the same lines, it changes nothing and says so:
   then put each rule in `research-mode.md` back by hand, delete the file, and
   save one change titled `Research mode off for <set-id>`.

2. If the designer shares findings, draft them as a change list for the **next
   working release**, not this research release. Write
   `.cache/designer/research/<set-id>/findings.md` with one row per change:
   page, what to change, why (the finding), and the skill that makes it
   (`change-the-words`, `change-the-journey`, `match-the-design`,
   `example-data`, `fake-a-service`). Offer to start with the first row.

## Verify

1. Run the fast check:

   ```
   npm run designer:check -- --set <set-id>
   ```

2. Photograph each task's starting page with its error state:

   ```
   npm run designer:show -- --set <set-id> --pages <start pages, comma-separated> --errors
   ```

   Read the key PNGs yourself. With research mode on, a relaxed page must have
   **no** error state when submitted empty. With research mode off (or after
   `off`), the error state must be back. Never claim either without looking.

3. Open the sheet at `.cache/designer/research/<set-id>/sheet.html` and check
   every task has a link.
4. Confirm the chooser at `http://localhost:3103/` shows the "Research mode on"
   tag while `research-mode.md` exists, and not after `off`.

## Hand-off

Research rules never ship. If the designer later says "hand this to the real
team", `designer:handoff` lists every row of `research-mode.md` under "cannot
ship", so turn research mode off first.

End with: "If this should become part of the real service, say 'hand this to
the real team' and I will prepare a brief and a patch for the plants-frontend
team."

## Without the npm scripts

If `designer:research` is not in `package.json` yet, run the same script
directly: `node scripts/designer/research/cli.js <on|off|status|sheet> <set-id>`.
