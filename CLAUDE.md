# Working with designers in the plants prototype

## Who you are working with

Interaction and content designers. They know HTML, Nunjucks and the GOV.UK Design System. They use git lightly and are not JavaScript architects.

- Reply in GDS plain English: short sentences, active voice, no jargon. Explain any term that is not in `docs/designers/glossary.md`.
- Say "your design release", not "set" or "plugin". Say what changed on which pages, and give links to click.
- Run the commands yourself. Never ask a designer to type a command you could run.

## What this repo is

1. A copy of the real plants frontend (plants-frontend), with real GOV.UK components and the real journey engine.
2. It runs with no backend: every service is stubbed, and the example notifications are made by replaying real pages.
3. It holds several sets under `src/server/app/sets/<id>/`: `high-risk-plants` is the real journey, `sample-journey` a placeholder, and everything else is a designer's own design release.
4. A weekly update merges the real service into it. `overrides.json` says which files are the prototype's own (`ours`); everything else belongs to the real service.
5. The designer's guide is `PROTOTYPE.md`. The designer docs are in `docs/designers/` (start at `docs/designers/README.md`).

## Load-bearing rules

1. **Ask whose file it is before any edit.** Run `npm run designer:where -- <paths>` and follow the answer. If a file belongs to the real service, offer two routes: "do it in your design release" (the default) or "prepare it for the real team" (the `hand-off` skill). Never edit a real-service file in place on a `design/*` branch.
2. **Never edit a frozen release.** Offer to start a working release from it (`design-release`).
3. **Change `copy.en.js` and `copy.cy.js` together.** Keep the same keys and the same function arguments. With no Welsh given, write `'[Welsh needed] <English>'`.
4. **Stay in the GOV.UK toolbox.** Use Nunjucks macros and `govuk-*` classes (`moj-*` only through the date picker macro). No Sass, inline styles, new client JavaScript or webpack entries. Log what the toolbox cannot do in `src/server/app/sets/<id>/design-gaps.md`.
5. **Example data replays real pages.** Never write records by hand. Use the `example-data` skill.
6. **One change at a time, and every part of the request.** Do each part in turn (see "Requests that fit two skills"), check it, show it, and end with the hand-off line (below). Use the `design-session` workflow for any list of notes (from a crit, a review or feedback, however many), and for four or more separate changes. One request with two or three parts ("add a branch and move the page") is done part by part in one run. Never make the designer ask again for a part they already asked for.
7. **Install only with the command `npm run designer:preflight` prints** (today `npx --yes npm@11.6.2 ci`, from `packageManager` in `package.json`). Never `npm install` or bare `npm ci`. One Bash command per call: no `&&`, `;` or `|`.
8. **Never use `--no-verify`, never force-push, and never push or open a pull request unless the designer asked.** An explicit request in their own message ("save it and open a pull request") is the yes: do not ask again. Otherwise ask first.
9. **No working release yet? Make one, then carry on.** When a change needs the designer's working release and there is none (only `high-risk-plants` and `sample-journey`), follow `design-release` section B for `plants-working` without asking, save it as its own commit (the one save made without being asked), tell the designer in one line, and go back to the change.
10. **Never edit** `.claude/settings.json`, `src/client/**`, `webpack.config.js`, `vitest.config.js`, `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**` or `src/server/app/shared/layout.njk`, except on a `handoff/*` or `maintain/*` branch.

Never add a file to `ours` in `overrides.json` just to make it editable: that hides the clash, it does not avoid it.

## Routing

Match what the designer says to a skill, then follow that skill's `SKILL.md` in `.claude/skills/<skill>/`.

| Skill                | The designer says things like                                                                                                                                                                                                                                                 | What it does                                                                 |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `run-the-prototype`  | "run the prototype", "start it", "it won't start", "port in use", "where did my data go", "open the arrival details page"                                                                                                                                                     | Checks the computer, starts `npm run dev`, prints the links                  |
| `design-release`     | "start a new design release", "make a working copy of the journey", "freeze what we've got as design release 2", "copy this change to release X", "which releases are there", "retire release X"                                                                              | Starts, freezes, carries changes between and retires releases                |
| `change-the-words`   | "change the wording", "reword this", "rename X to Y everywhere", "change the hint", "change the error message", "show me the Welsh"                                                                                                                                           | Finds every place a phrase lives and changes English and Welsh together      |
| `match-the-design`   | "make this page match the Figma", "change the spacing", "make it wider", "make it a summary list", "add a tag", "change the header"                                                                                                                                           | Rebuilds a layout with GOV.UK components and logs design gaps                |
| `port-a-kit-page`    | "re-create this page from the old prototype", "port the GB notification page for X", "build this Prototype Kit page here", "bring over the transporter page"                                                                                                                  | Rebuilds an old Prototype Kit page in a release, with a fidelity table       |
| `change-the-journey` | "add a question", "add a page", "add a guidance page", "move this page", "only show this page when", "skip this page if", "regroup the task list", "change the confirmation page", "a green panel with the reference"                                                         | Follows the repo's recipes to change the flow                                |
| `example-data`       | "add an example", "show a late notification", "an example stopped at the X page", "a link straight to the X page", "add a port", "fill the dashboard", "another organisation"                                                                                                 | Adds example notifications, parties, ports and countries, with stable links  |
| `fake-a-service`     | "add a transporter lookup", "saved transporters", "templates", "change the address book", "add an address manually", "delete an address", "copy as new", "add filters to the dashboard", "add tabs with counts", "confirm before deleting", "a success banner after deleting" | Builds things the real service cannot do yet, flagged "needs a real service" |
| `research-session`   | "get ready for research", "user testing next week", "let participants through", "turn errors off", "turn errors back on", "print a sheet for the session"                                                                                                                     | A research release, one link per task, errors off by one revertible commit   |
| `check-my-change`    | "check my changes", "did I break anything", "is it ready", "why won't it start", "what does this error mean", "the tests are failing"                                                                                                                                         | Runs the right check and explains every failure plainly                      |
| `show-my-change`     | "show me", "what does it look like", "before and after", "compare with the Figma", "compare with the real journey", "record a walkthrough", "make a review pack"                                                                                                              | Takes pictures into a gallery, with error states, phone width and video      |
| `share-my-change`    | "save my work", "share this", "make a pull request", "is my pull request merged yet", "merge my pull request", "undo my last change", "throw away what I just did", "go back to how it was"                                                                                   | Branch, commit message from the change, pull request when asked, safe undo   |
| `hand-off`           | "hand this to the real team", "send this to the developers", "make this real", "raise this with plants-frontend", "write a brief for the developers"                                                                                                                          | Writes a brief, screenshots and a checked patch for plants-frontend          |

When nothing fits, say so plainly and point at `docs/designers/README.md`.

### Requests that fit two skills

Do every part in the same turn, one skill after another, and report the parts together:

- **Words and layout** ("rename X, and drop the extra subheadings"): `change-the-words` first, then `match-the-design` for the layout part. If the page has no such element, say "already done: there is no such element", with the picture, and change nothing that only looks similar. When something similar could be what they meant (the numbered headings on check your answers), add one line offering to remove it.
- **Renaming a task list group** (only its words): `change-the-words`. Moving tasks between groups, or adding or removing a group: `change-the-journey`'s task-list recipe.
- **The confirmation page's panel and reference number**: `change-the-journey` (confirmation-variant recipe), never `match-the-design`.
- **A branch plus a move, or two journey changes**: `change-the-journey`, part by part in one run.
- **A dashboard like a Figma frame, filled with examples**: `example-data`, then `fake-a-service` (filters, tabs, counts), then `show-my-change` with the frame as `--reference`. `fake-a-service`, "Requests that need more than this skill", has the order.
- **An old Prototype Kit list page** (search, pick one or add a new one): `port-a-kit-page`, which follows `fake-a-service`'s worked example 1 for the page, its add page and its card on check your answers.
- **A change, then "save it" or "open a pull request"**: make the change, then carry straight on with `share-my-change`.
- **"Hand off" a change that was never made**: make it first with its skill, save it, then `hand-off`.
- **Any change to a research release after its sessions**: `research-session`, "After the sessions", step 3 picks the release it lands in, for every skill. Say where in one line, then carry on.

Before building any part, check whether it is already true (look at the picture, or run `npm run designer:release -- orders <release> <pages>` for a move). Say which parts already hold and do only the rest.

## Workflows

Workflows run several agents for one big job. Launch each by `scriptPath` with every argument filled in: see `.claude/workflows/README.md`. Every workflow's skill also lists the same steps to run one after another on hosts without the Workflow tool.

| Workflow          | Started by         | Use it for                                                                                                                                             |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wording-sweep`   | `change-the-words` | A wording change across more than 5 pages, or a pasted content document ("apply these content changes", "content sweep")                               |
| `port-kit-page`   | `port-a-kit-page`  | Every Prototype Kit page port ("port this page from the old prototype")                                                                                |
| `prepare-handoff` | `hand-off`         | A change the real team needs with its tests, on a `handoff/<slug>` branch ("prepare this for the real service with its tests")                         |
| `design-session`  | this file          | Any list of notes, however many ("here are my notes from the crit", "work through this feedback"), or four or more changes at once ("do all of these") |

For `design-session`, pass `{ "set": "<release>", "requests": ["<one change>", "..."] }`. It starts the release from the real journey when it does not exist yet, routes each request to a skill, checks each one, parks what fails with a plain reason, shows the whole session in one gallery and saves each landed request as its own commit. It never pushes. Without the Workflow tool, follow the manual steps in `.claude/workflows/README.md`.

## Branches

- `design/<set>-<slug>`: a designer's work, for example `design/plants-working-consignment-addresses`. Create it from `main` before the first change.
- `handoff/<slug>`: work meant for the real service, made by `hand-off`. Never merged into this prototype's `main`.
- `maintain/<slug>`: a maintainer's work on the prototype itself.

One rule for every skill: **on `main`, make a `design/*` branch; on any other branch (`design/*`, `feat/*`, a trial branch, `maintain/*`), stay on it.** Starting a release, making the change and saving it all happen on that one branch, so nothing is split across two. Never start a release on a `handoff/*` branch.

## How every change ends

1. Check it: `npm run designer:check -- --set <id>` and its plain-English result. `--walk` includes `--full`: never run both.
2. Show it: `npm run designer:show -- --set <id> --pages <the pages it is on> --before`, the gallery path, and links to click (`npm run designer:examples -- links <id>`; add `?page=<page>` to open another page of an example). Open the key pictures yourself before describing them. Never claim a visual result you have not looked at, and never hand the designer links to click instead of pictures you could take (`--url`, `--examples`, `--pages chooser`).
3. The hand-off line, word for word: "If this should become part of the real service, say 'hand this to the real team' and I will prepare a brief and a patch for the plants-frontend team."

## The designer commands

All run as `npm run <name> -- <arguments>`:

- `designer:where` whose file is it · `designer:check` check a release · `designer:preflight` is the computer ready (`--share` also checks GitHub sign-in and access) · `designer:fresh` runs the prototype like `npm run dev` but keeps no release data across a restart
- `designer:show` pictures and gallery (`--pages`, `--before`, `--errors`, `--mobile`, `--each-example`, `--url`, `--examples`, `--reference`, `--compare`, `--video`)
- `designer:release` list, orders, changes, freeze, carry, retire, remount · `designer:examples` list, check, links, init, fixtures
- `designer:words` find words, page (every string one page shows), Welsh report · `designer:research` research mode on, off, status, sheet · `designer:handoff` brief and patch
- Page names: every tool takes a page's address (`consignors/select`, `arrival-details`, `notification-view`) and `task-list` for the task list. `designer:words` prints those names; `designer:show` also takes page ids and `hub`.
- `designer:format` tidies every file like `npm run format`, printing only the files it changed. Use it in place of `npm run format`.
- `designer:save -- -m "<first line>" [-m "<body>"]` saves what is staged as one commit. The pre-commit checks run as usual; their hundreds of lines go to `.cache/designer/commit.log`, and it prints one line when the save worked or the end of the log when it did not. Use it for every save in place of `git commit` (`--no-edit` finishes a merge). Stage each file by name with `git add` first; never put paths after the message.
- Run every `npm run` and `git` command from the repo root (the folder holding `package.json`). If your shell is somewhere else, use `npm --prefix <repo root> run <name>` and `git -C <repo root> …`.
- `new:set -- <id> --from high-risk-plants --title "<name>" --describe "<text>" --purpose working|frozen|research` starts a release (the `design-release` skill runs it)
- `designer:kit` finds the old Prototype Kit prototype and copies a page from it (`port-a-kit-page`)

## Read more

- `.claude/rules/` loads extra rules when you touch copy, templates, sets, example data or real-service files.
- `docs/designers/where-changes-go.md` explains ownership and the weekly update.
- `docs/designers/checks-and-errors.md` explains every check failure.
- A "missing hook script" message (`sonar-secrets` or `sonar-analyze.sh`) means the prototype's own Claude Code settings are not in place yet: see "For maintainers" in `README.md`. It is harmless. Carry on, and tell the designer in one line that the prototype maintainer knows about it. Until then there is no automatic edit guard, so rule 1 matters all the more.
