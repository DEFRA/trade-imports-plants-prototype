---
name: run-the-prototype
description: 'Get the prototype running on the designer''s computer and hand them the links to click: checks the computer first (designer:preflight: Node version, installed packages, the picture-taking browser, and whether port 3103 is free or who holds it), installs what is missing, starts npm run dev in the background, waits until it answers, then prints the prototypes page, the set''s address and its example links. Explains once why data seems to vanish (saving a file restarts the prototype), how Reset brings the examples back and how to sign in as another organisation. Never stops a program without asking. Use when a designer says "run the prototype", "start it", "start the prototype", "open the X page", "take me to the X page", "it won''t start", "port in use", "address already in use", "where did my data go", "my notifications disappeared" or "sign in as another organisation". NOT for checking a change (use check-my-change), for screenshots or a gallery (use show-my-change), for adding or fixing example notifications (use example-data) or for making design changes.'
---

# Run the prototype

You are helping an interaction or content designer run the prototype on their
own computer. They know HTML, Nunjucks and the GOV.UK Design System. They are
not JavaScript developers. Reply in GDS plain English: short sentences,
active voice, no jargon without a plain explanation.

Say "the prototype", "your design release" and "the prototypes page" (the
page at `http://localhost:3103/` that lists every set), not "server", "set
plugin" or "chooser".

## Guard rails

- **Never stop a program without asking.** If port 3103 is in use, say which
  program holds it and ask before stopping anything. Never run `kill`,
  `pkill` or `lsof ... | xargs kill`.
- **Install only with the command the preflight's `Packages` line prints**
  (today `npx --yes npm@11.6.2 ci`; it follows `packageManager` in
  `package.json`). Never `npm install` or a bare `npm ci`: a newer npm can
  refuse this project's lock file.
- **One Bash command per call.** No `&&`, `;` or `|`.
- **This skill changes no files.** It runs, installs and explains. If the
  designer then asks for a change, follow the skill for that change. Before
  editing any file, that skill runs `npm run designer:where -- <path>` and
  checks `overrides.json`: anything not in its `ours` list belongs to the
  real service and is never edited on a `design/*` branch.

## Step 1: Check the computer

```bash
npm run designer:preflight
```

It prints one line per check and changes nothing:

| Line starts              | Means                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| `OK - Node`              | The right Node version (same major version as `.nvmrc`)                   |
| `OK - Packages`          | Installed packages match `package-lock.json`                              |
| `OK - Browser`           | The browser used for pictures is installed                                |
| `OK - Port 3103`         | Nothing is using the prototype's port                                     |
| `Needs doing - ...`      | Something to fix first; the line says what to run                         |
| `In use - Port 3103`     | Something holds port 3103; see step 3                                     |
| `Before you share - ...` | The prototype runs, but saving, sharing or handing off needs this; step 2 |

It exits with 1 only when something needs doing. `--json` gives the same
results as data (a `todo` result with `commands` lists the exact commands).

If npm says `Missing script: "designer:preflight"`, the designer tools are not
on this branch. Say so, then carry on from step 2 with `npm run dev` alone.

## Step 2: Fix what needs doing

Do only what a `Needs doing` line asks, in this order:

1. **Node.** Tell the designer the version the line names. If they use nvm,
   they run `nvm install` in the prototype's folder and open a new terminal.
   You cannot change their Node version for them. Stop until it is fixed.
2. **Packages.** Tell the designer this takes a few minutes, then run the
   command the line prints, today:

   ```bash
   npx --yes npm@11.6.2 ci
   ```

3. **Browser.** Only needed for pictures (`show-my-change`) and walkthroughs,
   but do it now so the first picture works:

   ```bash
   npm run playwright:install
   ```

   On Linux this can ask for a password to install system libraries. If it
   fails for that reason, tell the designer to run it themselves.

4. **Real service for hand-offs** (a fresh clone has no `upstream` remote,
   because `git clone` does not copy remotes). Run the two commands the line
   prints, one per call, without asking: they only let the prototype read
   plants-frontend, and the second locks it so nothing can ever be sent
   there.

   ```bash
   git remote add upstream https://github.com/DEFRA/trade-imports-plants-frontend.git
   ```

   ```bash
   git remote set-url --push upstream DISABLED
   ```

   When the line asks only for the second, run only that. Never change
   `upstream`'s fetch address or add any other remote.

5. **Git name and email, GitHub command line.** These are the designer's own
   accounts: tell them what the line says and carry on. Nothing is needed to
   run the prototype. Saving needs a git name and email; opening a pull
   request works without `gh` (share-my-change gives a link instead).

Run `npm run designer:preflight` again. Carry on when only `OK`, `In use` or
`Before you share` lines are left.

## Step 3: If port 3103 is in use

The line names the program, for example "in use by node (process 4242)". When
it says "It answers like the prototype", the prototype is almost certainly
already running, in another terminal or an editor.

Tell the designer: "The prototype is probably already running. Open
http://localhost:3103." Then go to step 5.

If they say it is not working, or they want a fresh start: first run
`npm run designer:preflight` again, straight before you ask, because the
number changes. `npm run dev` restarts its program on every saved file and
every git switch or commit, so a number from a few minutes ago is usually
out of date. Then ask with the number it just printed: "Shall I stop the
program on port 3103 (process 4242) and start the prototype again?" Only if
they say yes, stop that one process by its number:

```bash
kill 4242
```

If the preflight then names a different process on 3103, the dev watcher
started a new copy: that means `npm run dev` is still running in another
terminal. Ask the designer to stop it there (Ctrl+C) rather than chasing
process numbers. Then run `npm run designer:preflight` again and go to step 4. Never stop a process the preflight did not name.

For pictures, nothing needs stopping: `show-my-change` runs its own copy on a
free port from 3203, whatever holds 3103.

## Step 4: Start the prototype

Start it in the background, so the conversation can carry on while it runs.
In Claude Code, run this with the Bash tool's `run_in_background` option:

```bash
npm run dev
```

On a host without background commands, ask the designer to run `npm run dev`
in a terminal of their own and leave it open.

For a research session or a demo that must start from the examples after
every restart, start `npm run designer:fresh` instead: the same prototype, but
design releases keep nothing across a restart.

Then wait until it answers (up to two minutes):

```bash
npm run designer:preflight -- --wait
```

It prints `The prototype is running: http://localhost:3103`, or says it did
not answer. If it did not answer, read the background output of `npm run dev`
and find the first error:

| You see in the output                                               | What it means                                          | What to do                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| `listen EADDRINUSE: address already in use 0.0.0.0:3103`            | Something else already has port 3103                   | Step 3                                                        |
| `Starting inspector on 0.0.0.0:9229 failed: address already in use` | Another copy of `npm run dev` is running somewhere     | Harmless on its own; if the prototype does not answer, step 3 |
| `Server failed to start` with another message                       | The prototype itself has a problem                     | Use `check-my-change`; it explains start-up errors            |
| `[nodemon] app crashed - waiting for file changes`                  | It stopped on an error; it retries when a file changes | Fix the first error above it (use `check-my-change`)          |
| `Cannot find module` or `ERR_MODULE_NOT_FOUND` naming a package     | Packages are missing                                   | The preflight's install command, then start again             |
| `Access your frontend on http://localhost:3103`                     | It started                                             | Step 5                                                        |

## Step 5: Give the designer the links

Name the set they want. If they did not say, use their working release (the
newest set under `src/server/app/sets/` other than `high-risk-plants` and
`sample-journey`), or `high-risk-plants` if they have none.

Print the example links:

```bash
npm run designer:examples -- links <set-id>
```

Then give, as clickable links:

- the prototypes page: `http://localhost:3103/`
- the set: `http://localhost:3103/<set-id>`
- every example link the command printed, with its label

If npm says `Missing script: "designer:examples"`, give only the first two.

**"Open the X page".** Most pages only exist inside a notification, so
`http://localhost:3103/<set-id>/<page>` will not open. Give the example link
that stops on that page (its label says where it stops). If none does, say
so and offer `example-data`: "Say 'add an example stopped at the X page' and
I will make one." The dashboard is always `http://localhost:3103/<set-id>`.

The first visit asks nobody for a password: on your own computer the
prototype signs you in straight away.

## Step 6: Explain how data behaves (once per conversation)

Say this once, in your own words, the first time the prototype starts or
when the designer asks "where did my data go":

- **Saving a file restarts the prototype.** Saving a page, copy or flow file
  (any `.js`, `.json` or `.njk` under `src/`, except tests and
  `src/client/`) restarts it. Refresh the page after a few seconds.
- **The real journey forgets on restart.** In `high-risk-plants`, a restart
  empties every notification. Its examples come back on your next visit.
- **Design releases remember, on your computer.** A design release keeps its
  notifications across restarts in `.cache/designer/data/` (git ignores that
  folder, so it is never shared). The deployed prototype does not, and
  neither does `npm run designer:fresh`.
- **Reset puts the examples back.** On the prototypes page, press "Reset this
  prototype's data" under the set. It empties that set for everyone using
  this copy of the prototype and makes the examples again.
- **Example links keep working** after a restart or a Reset, even though the
  reference numbers change.
- **Signing in as another organisation.** On your computer, open
  `http://localhost:3103/auth/stub-sign-in?organisationId=<organisation-id>`,
  for example `example-organisation-b`. Examples made for one organisation
  only show to people signed in to it. To go back, open
  `http://localhost:3103/auth/sign-out`, then the prototypes page. The
  deployed prototype uses the Defra ID stub instead: pick a test user in the
  organisation you want.

## Step 7: Verify

Only say the prototype is running after `npm run designer:preflight -- --wait`
printed `The prototype is running`. If the designer reports a blank page,
unstyled page or error in the browser, do not guess: ask what they see, or
take a picture with `show-my-change`.

## Step 8: Next steps and hand-off

End with what they can do next:

- "Make a change, then say 'check my changes' (`check-my-change`)."
- "Say 'show me' for pictures of your pages (`show-my-change`)."
- "Say 'save my work' when you are happy (`share-my-change`)."

Then the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

## References

- `docs/designers/your-first-hour.md`: the designer's own guide to this
- `docs/designers/example-data.md`: example links, Reset, organisations
- `docs/designers/services-and-dashboards.md`: what a design release keeps
  across restarts
- `docs/designers/checks-and-errors.md`: start-up errors explained
- `scripts/designer/preflight/checks.js`: the preflight rules
