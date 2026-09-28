# trade-imports-plants-prototype: repo contract

This file is the one full source of the rules that govern this repo, for
any agent that reads a file here. It holds no routing: a designer's own
request is worked out and routed by the `prototype` skill at
`~/git/defra/trade-imports-workspace/.claude/skills/prototype/SKILL.md`,
in a Claude Code session opened at the workspace root
(`~/git/defra/trade-imports-workspace`), not in this repo on its own.

## What this repo is

1. A copy of the real plants frontend (plants-frontend), with real GOV.UK
   components and the real journey engine. The aim is one high-fidelity
   experience: work on one page and the next page is already there,
   because it is the real one.
2. It runs with no backend: every service is stubbed, and the example
   notifications are made by replaying real pages.
3. It holds several sets under `src/server/app/sets/<id>/`:
   `high-risk-plants` is the real journey, `sample-journey` a placeholder,
   and everything else is a designer's own design release.
4. A weekly update merges the real service into it. `overrides.json` says
   which files are the prototype's own (`ours`); everything else belongs
   to the real service.
5. Something the real service cannot do yet is built as a prototype-owned
   service in `src/server/app/services/<name>/`, in the same `index.js`,
   `client.js` and `stub.js` shape as the real services, with its own line
   in `ours`. `npm run designer:service` makes, lists and retires them.
   Their stub plumbing lives in `src/server/prototype-support/`.
6. The designer's guide is `PROTOTYPE.md`. The designer docs are in
   `docs/designers/` (start at `docs/designers/README.md`).

## Load-bearing rules

1. **Ask whose file it is before any edit.** Run
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- <paths>`
   and follow the answer. Never edit a real-service file in place on a
   `design/*` branch: offer "do it in your design release" or "prepare it
   for the real team" instead.
2. **Never edit a frozen release.** Start a working release from it
   instead.
3. **Change `copy.en.js` and `copy.cy.js` together.** Same keys, same
   function arguments. With no Welsh given, write
   `'[Welsh needed] <English>'`.
4. **Stay in the GOV.UK toolbox.** Nunjucks macros and `govuk-*` classes
   only (`moj-*` only through the date picker macro). No Sass, inline
   styles, new client JavaScript or webpack entries. Log what the toolbox
   cannot do in `src/server/app/sets/<id>/design-gaps.md`.
5. **Example data replays real pages.** Never write a record by hand:
   every example is a list of page answers posted to the set's own
   routes.
6. **Never edit a real-service file on a `design/*` branch.** The one
   exception is a **prototype-owned service folder**: a folder under
   `src/server/app/services/` that `overrides.json` lists on its own line
   in `ours` (today `transporters`, `templates`, `ins-address-book` and
   `notification-search`). It may be made or changed only through the
   service scaffold (`npm run designer:service -- new <name>`), which
   refuses a name the real service already uses. Every other folder under
   `src/server/app/services/` (such as `address-book`, `countries`,
   `ports`, `persistence` and `set-context`) belongs to the real service
   and stays forbidden on a `design/*` branch.
7. **Never add a file to `ours` in `overrides.json` just to make it
   editable.** That hides the clash, it does not avoid it. The one way a
   services folder joins `ours` is the service scaffold above.
8. **Install only with the pinned npm version** (`packageManager` in
   `package.json`). Never `npm install` or a bare `npm ci`.
9. **Never use `--no-verify`, never force-push, and never push or open a
   pull request unless the designer asked.**
10. **Never edit** `.claude/settings.json`, `src/client/**`,
    `webpack.config.js`, `vitest.config.js`,
    `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**` or
    `src/server/app/shared/layout.njk`, except on a `chore/*` branch (a
    maintainer's own change to this repo's contract), with the one
    exception in rule 6 above.

## Branches

- `design/<set>-<slug>`: a designer's work, for example
  `design/plants-working-consignment-addresses`. Create it from `main`
  before the first change. Prototype-only: it never crosses into any
  other repository.
- `chore/NO_JIRA-<slug>` or `chore/EUDPA-N-<slug>`: a maintainer's own
  change to this repo (its scripts, rules, docs or contract), following
  the workspace's own branch-naming rule.
- No branch here is named after a hand-off. Work meant for the real service
  is made in the real repository, `trade-imports-plants-frontend`, on
  `feat/EUDPA-N-<slug>` (or `feat/NO_JIRA-<slug>` without a ticket yet) —
  never here. A hand-off folder under `handoffs/` still lands on the
  designer's own `design/*` branch.

One rule for every change: **on `main`, make a `design/*` branch; on any
other branch, stay on it.** Starting a release, making the change and
saving it all happen on that one branch, so nothing is split across two.

## Commands

Every command in this repo's own docs and rules is written in the tilde
`--prefix` / `-C` form, and an agent working from the workspace root
should never use any other form:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run <script> -- <args>
git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype <args>
```

A bare `npm run` or a bare `git` command from the workspace root acts on
the **workspace** repository, not this one — the most dangerous failure
an agent working here can make.

Working from inside this repo's own folder, the plain `npm run <script>`
and `git <args>` forms are fine.

## Where the routing lives

Designers say what they want in their own words; they never need to name
a skill, a reference or a file. Every request is worked out and routed by
`~/git/defra/trade-imports-workspace/.claude/skills/prototype/SKILL.md`
and its `references/ROUTING.md`, from a Claude Code session opened at the
workspace root. This repo carries none of that routing itself.

## Extra rules for some files

Before you change these files, read the matching rule file in
`.claude/rules/` and follow it. Claude Code loads them for you when you
touch a file their `paths:` glob matches, whether the session is rooted
here or at the workspace root; another agent reads them by hand.

- copy files (`copy.en.js`, `copy.cy.js`): `.claude/rules/copy.md`
- page templates in a set (`src/server/app/sets/**/*.njk`):
  `.claude/rules/templates.md`
- anything in a set (`src/server/app/sets/`) or a set's gateway
  (`src/server/app/routes-<set>.js`): `.claude/rules/designer-sets.md`
- example data (`src/server/prototype-seed/`,
  `src/server/prototype-data/`): `.claude/rules/prototype-seed.md`
- the real journey, the shared platform, `src/server/app/services/`,
  `src/client/`, `fit/` and the build config: `.claude/rules/ownership.md`

## Read more

- `PROTOTYPE.md`: the designer's guide.
- `docs/designers/where-changes-go.md`: ownership and the weekly update.
- `docs/designers/checks-and-errors.md`: every check failure explained.
- `docs/designers/services-and-dashboards.md`: prototype-owned services.
