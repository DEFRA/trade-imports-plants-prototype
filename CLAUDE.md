If Claude Code reports a missing hook script, the settings proposal has not been applied yet. It is harmless; tell Sam.

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
6. **One change per request.** Then check it, show it, and end with the hand-off line (below).
7. **Install only with `npx --yes npm@11.6.2 ci`.** Never `npm install` or bare `npm ci`. One Bash command per call: no `&&`, `;` or `|`.
8. **Never use `--no-verify`, never force-push, and never push or open a pull request without asking.**
9. **Never edit** `.claude/settings.json`, `src/client/**`, `webpack.config.js`, `vitest.config.js`, `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**` or `src/server/app/shared/layout.njk`, except on a `handoff/*` or `maintain/*` branch.

Never add a file to `ours` in `overrides.json` just to make it editable: that hides the clash, it does not avoid it.

## Routing

Match what the designer says to a skill, then follow that skill's `SKILL.md` in `.claude/skills/<skill>/`.

| Skill                | The designer says things like                                                                                                                                                                    | What it does                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `run-the-prototype`  | "run the prototype", "start it", "it won't start", "port in use", "where did my data go", "open the arrival details page"                                                                        | Checks the computer, starts `npm run dev`, prints the links                  |
| `design-release`     | "start a new design release", "make a working copy of the journey", "freeze what we've got as design release 2", "copy this change to release X", "which releases are there", "retire release X" | Starts, freezes, carries changes between and retires releases                |
| `change-the-words`   | "change the wording", "reword this", "rename X to Y everywhere", "change the hint", "change the error message", "show me the Welsh"                                                              | Finds every place a phrase lives and changes English and Welsh together      |
| `match-the-design`   | "make this page match the Figma", "change the spacing", "make it wider", "make it a summary list", "add a tag", "change the header"                                                              | Rebuilds a layout with GOV.UK components and logs design gaps                |
| `port-a-kit-page`    | "re-create this page from the old prototype", "port the GB notification page for X", "build this Prototype Kit page here", "bring over the transporter page"                                     | Rebuilds an old Prototype Kit page in a release, with a fidelity table       |
| `change-the-journey` | "add a question", "add a page", "add a guidance page", "move this page", "only show this page when", "skip this page if", "rename the task list group", "change the confirmation page"           | Follows the repo's recipes to change the flow                                |
| `example-data`       | "add an example", "show a late notification", "an example stopped at the X page", "a link straight to the X page", "add a port", "fill the dashboard", "another organisation"                    | Adds example notifications, parties, ports and countries, with stable links  |
| `fake-a-service`     | "add a transporter lookup", "saved transporters", "templates", "add filters to the dashboard", "add tabs with counts", "confirm before deleting", "a success banner after deleting"              | Builds things the real service cannot do yet, flagged "needs a real service" |
| `research-session`   | "get ready for research", "user testing next week", "let participants through", "turn errors off", "turn errors back on", "print a sheet for the session"                                        | A research release, one link per task, errors off by one revertible commit   |
| `check-my-change`    | "check my changes", "did I break anything", "is it ready", "why won't it start", "what does this error mean", "the tests are failing"                                                            | Runs the right check and explains every failure plainly                      |
| `show-my-change`     | "show me", "what does it look like", "before and after", "compare with the Figma", "compare with the real journey", "record a walkthrough", "make a review pack"                                 | Takes pictures into a gallery, with error states, phone width and video      |
| `share-my-change`    | "save my work", "share this", "make a pull request", "undo my last change", "throw away what I just did", "go back to how it was"                                                                | Branch, commit message from the change, pull request when asked, safe undo   |
| `hand-off`           | "hand this to the real team", "send this to the developers", "make this real", "raise this with plants-frontend", "write a brief for the developers"                                             | Writes a brief, screenshots and a checked patch for plants-frontend          |

When a request fits two skills, pick the one for the main change and say which part another skill will do next. When nothing fits, say so plainly and point at `docs/designers/README.md`.

## Workflows

Workflows run several agents for one big job. Launch each by `scriptPath` with every argument filled in: see `.claude/workflows/README.md`. Every workflow's skill also lists the same steps to run one after another on hosts without the Workflow tool.

| Workflow          | Started by         | Use it for                                                                                                                            |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `wording-sweep`   | `change-the-words` | A wording change across more than 5 pages, or a pasted content document ("apply these content changes", "content sweep")              |
| `port-kit-page`   | `port-a-kit-page`  | Every Prototype Kit page port ("port this page from the old prototype")                                                               |
| `prepare-handoff` | `hand-off`         | A change the real team needs with its tests, on a `handoff/<slug>` branch ("prepare this for the real service with its tests")        |
| `design-session`  | this file          | A list of several changes to one release at once ("here are my notes from the crit", "do all of these", "work through this feedback") |

For `design-session`, pass `{ "set": "<release>", "requests": ["<one change>", "..."] }`. It routes each request to a skill, checks each one, parks what fails with a plain reason, shows the whole session in one gallery and saves each landed request as its own commit. It never pushes.

## Branches

- `design/<set>-<slug>`: a designer's work, for example `design/plants-working-consignment-addresses`. Create it from `main` before the first change.
- `handoff/<slug>`: work meant for the real service, made by `hand-off`. Never merged into this prototype's `main`.
- `maintain/<slug>`: a maintainer's work on the prototype itself.

## How every change ends

1. Check it: `npm run designer:check -- --set <id>` and its plain-English result.
2. Show it: `npm run designer:show -- --set <id>`, the gallery path, and `http://localhost:3103/<id>/...` links to click. Open the key pictures yourself before describing them. Never claim a visual result you have not looked at.
3. The hand-off line, word for word: "If this should become part of the real service, say 'hand this to the real team' and I will prepare a brief and a patch for the plants-frontend team."

## The designer commands

All run as `npm run <name> -- <arguments>`:

- `designer:where` whose file is it · `designer:check` check a release · `designer:preflight` is the computer ready
- `designer:show` pictures and gallery · `designer:release` list, freeze, carry, retire · `designer:examples` list, check, links, init
- `designer:words` find words, Welsh report · `designer:research` research mode on, off, status, sheet · `designer:handoff` brief and patch
- `new:set -- <id> --from high-risk-plants --describe "<text>" --purpose working|frozen|research` starts a release (the `design-release` skill runs it)

## Read more

- `.claude/rules/` loads extra rules when you touch copy, templates, sets, example data or real-service files.
- `docs/designers/where-changes-go.md` explains ownership and the weekly update.
- `docs/designers/checks-and-errors.md` explains every check failure.
