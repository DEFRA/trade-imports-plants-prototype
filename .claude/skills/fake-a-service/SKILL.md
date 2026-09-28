---
name: fake-a-service
description: 'Build the things the real plants service cannot do yet, inside a design release, with a clear "needs a real service" flag: a transporter lookup or saved transporters, notification templates, dashboard filters, tabs and counts, a success banner after an action, a "confirm before deleting" page, "come back to where I was" after a side trip, and a home page across plants, animals and products. Uses the prototype''s fake services and records wrapper in src/server/prototype-services/. Use when a designer says "add a transporter lookup", "saved transporters", "templates", "save as a template", "start from a template", "fake a service", "add filters to the dashboard", "add tabs to the dashboard", "add counts to the dashboard", "a success banner after …", "confirm before deleting", "are you sure page", "come back to where I was", "return to the page I came from", "a home page across plants, animals and products". NOT for data the stubs already serve, such as more addresses, ports, countries or example notifications (use example-data), NOT for adding or changing a question in the journey (use change-the-journey), NOT for layout only (use match-the-design).'
---

# Fake a service

You are helping an interaction or content designer show something the real
plants service cannot do yet. They know HTML, Nunjucks and the GOV.UK Design
System. They are not JavaScript architects. Reply in GDS plain English: short
sentences, active voice, and say what changed on which pages.

Most of the old prototype's recent work was like this: address book,
transporters, templates, dashboards with tabs and counts. The real plants
service has none of those yet. This skill builds them in the designer's own
design release, from the GOV.UK toolbox, and makes sure everyone can see which
parts are fake.

Words to use with the designer:

- "your design release", not "set" or "plugin"
- "a fake service": pretend data and behaviour that stands in for a real
  service which does not exist yet
- "needs a real service": the flag every fake carries into the hand-off

## Guard rails

Read these before every run. Breaking one is a failure even if every check
passes.

- **Only in a design release the designer owns.** Every file you change is
  under `src/server/app/sets/<release>/`, is the release's own gateway
  `src/server/app/routes-<release>.js` (step 3 only), or is a new fake under
  `src/server/prototype-services/<name>/`. Run `npm run designer:where` on
  every path before you edit it (step 3). Anything not in the `ours` list of
  `overrides.json` belongs to the real service: the weekly update overwrites it
  or clashes with it.
- **Never in high-risk-plants.** It is the real service's journey and must
  behave exactly as plants-frontend does. Never wrap its records, never import
  `prototype-services` from it. If asked, offer to make the change in a design
  release (`design-release`), and say a real one needs the plants team
  (`hand-off`).
- **Never in a frozen release.** Offer a working copy of it instead.
- **Never a route at the server root.** A release's routes are mounted under
  `/<release>` by its gateway. Never touch `src/server/router.js`,
  `src/server/sets-index/**` or `src/server/prototype-sets/**` to add a page.
- **Every fake is named "needs a real service".** Say it to the designer. Add a
  row to the release's `design-gaps.md` for it (step 7). The hand-off brief
  picks up every import of `prototype-services` on its own, but the row says
  what the real service would need to do.
- **Never edit shared code.** Not `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**`,
  `src/client/**`, `webpack.config.js` or another set's folder. A release never
  imports from another set: copy what you need into the release.
- **GOV.UK toolbox only.** Nunjucks macros and `govuk-*` classes. No Sass, no
  inline styles, no new client JavaScript, no webpack entries. The MoJ filter
  and the GOV.UK Tabs script are not loaded here: see
  `references/dashboard-filters-and-tabs.md`.
- **English and Welsh together.** Every new string goes in `copy.en.js` and
  `copy.cy.js` with the same keys. With no Welsh from the designer, write
  `'[Welsh needed] <the English>'`.
- **No test files in a release.** Never create `*.test.js` or
  `*.fit.spec.js` inside `sets/<release>/`. A new fake service under
  `src/server/prototype-services/` is the exception: it gets an
  `index.test.js` (see `references/fake-a-service.md`).
- **One change at a time.** A request with two or three parts is done part by
  part in this run, each checked before the next. A request that needs other
  skills too follows "Requests that need more than this skill" below. With
  four or more changes, start the `design-session` workflow (CLAUDE.md,
  "Workflows"). Never make the designer ask again for a part they already
  asked for.
- **One Bash command per call.** Install only with `npx --yes npm@11.6.2 ci`.
  Never `--no-verify`, never push.

## Step 1: Find the release

Run:

```bash
git status
```

The first line names the branch. If it is `main`, make a branch before
editing:

```bash
git switch -c design/<release>-<short-slug>
```

Work out the release:

1. If the designer named one, use it.
2. If not, run `npm run designer:release -- list` and pick the working release
   changed most recently. If two or more fit and nothing points to one, ask one
   question: which release.

Refuse in plain English, and offer the safe route, when the target is
`high-risk-plants`, `sample-journey` (a placeholder: never change it), or a
frozen release.

If the designer has no working release yet, make one now without asking:
follow `design-release` section B with the id `plants-working` (or the id the
designer used), save it as its own commit as that section says, then come
back here and carry on. A service home page is the one exception: it is a new
set of its own, made from `sample-journey` (see
`references/service-home.md`).

## Requests that need more than this skill

Many real asks cross skills. Do the parts in this order, in one run, and
report them together:

1. **No working release**: `design-release` section B (above).
2. **Example notifications to fill the page** ("filled with examples", "a
   late one", "one for another organisation"): `example-data`, before the
   dashboard change, so the counts and tabs have something to show.
3. **The fake itself**: this skill.
4. **A journey page for it** (a lookup page that collects an answer):
   `change-the-journey`'s add-a-page recipe, as step 5 says.
5. **Matching a Figma frame**: `show-my-change` with `--reference`, last, once
   the page exists. `match-the-design` for any layout tweaks it shows.

For example, "make my dashboard look like this Figma, filled with examples":
1 if needed, then 2 (a late, a submitted and an amended example), then
`references/dashboard-filters-and-tabs.md`, then 5 with the Figma frame
beside the dashboard picture.

## Step 2: Pick the reference

Match the request to one reference and read all of it before you edit:

| The designer wants                                                                                                                      | Read                                       |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| A lookup, a saved list, "add a new one": transporters, templates, anything the real service would fetch from a service it does not have | `references/fake-a-service.md`             |
| Filters, tabs or counts on the dashboard                                                                                                | `references/dashboard-filters-and-tabs.md` |
| A green "done" message after an action                                                                                                  | `references/success-banner.md`             |
| "Are you sure?" before deleting, cancelling or discarding                                                                               | `references/confirm-then-act.md`           |
| Go off to another page (add a transporter, change an answer) and land back where you were                                               | `references/come-back-to-where-i-was.md`   |
| A front door across plants, animals and products                                                                                        | `references/service-home.md`               |

If the request is really example data (more addresses, a late notification,
a filled dashboard), stop and use `example-data`. If it is a new question in
the journey, stop and use `change-the-journey`. You can use this skill and then
that one: for example, a transporter lookup page is a fake (this skill)
registered as a journey page (`change-the-journey`'s add-a-page recipe).

Tell the designer in one line which reference you will follow, what it will
change, and which part is fake.

## Step 3: Check who owns each file

List every file you plan to create or change, then run:

```bash
npm run designer:where -- <path> <path> <path>
```

Every path must say "Yours". Files under `src/server/prototype-services/` say
"Yours" once the suite is set up. If any path does not, do not edit it.

Check the release's records are wrapped. Open
`src/server/app/routes-<release>.js` and look for:

```js
configureRecords(SET_ID, designerRecords(SET_ID, records))
```

`npm run new:set` writes this for a release copied from high-risk-plants. If
the line says `configureRecords(SET_ID, records)` instead, the dashboard
helpers and Reset will not work. The gateway is the release's own file, so
change that line and add the import (the reference shows both).

## Step 4: Check the starting point

Before editing, make sure the release is green, so any failure afterwards is
yours:

```bash
npm run designer:check -- --set <release>
```

If it fails before you have changed anything, stop. Say "your release was
already failing before this change", and offer `check-my-change`.

## Step 5: Make the change

Follow the reference step by step. Copy the pattern it names from the
release's own files (never import from `high-risk-plants`). As you go:

- New words go in the feature's `copy/copy.en.js` and `copy/copy.cy.js`.
- A new page in a release gets its route in the release's
  `journeys/linear/features/index.js` `allRoutes`.
- A new page that collects an answer is a journey page: register it with
  `change-the-journey` (the add-a-page recipe), then come back here for the
  fake behind it.

Then format what you changed:

```bash
npm run designer:format
```

## Step 6: Check and show it

Run these one at a time. Each must pass before the next.

1. The full check. It boots the release, so a missing import or route shows
   here:

   ```bash
   npm run designer:check -- --set <release> --full
   ```

2. Show the dashboard and every page you added, before and after. The
   dashboard is pictured with the release's example notifications on it:

   ```bash
   npm run designer:show -- --set <release> --pages dashboard,<new pages> --errors --before --mobile
   ```

   - `--mobile` matters for tables and lists: a wide table wraps badly at
     phone width, and the picture shows it (`match-the-design`'s
     `references/nearest-equivalent.md` says which columns to drop or merge).
   - A page reached from another page rather than by Continue (an "add a
     transporter" form, a confirm page, the page you come back to with its
     banner) is pictured with `--url`, as it shows in the browser after the
     release's address. Inside a notification, write `{notification}` for its
     reference:
     `--url "notifications/{notification}/transporter-select/add"`.
     `--errors` pictures each one sent empty, too.
   - Filters, tabs and empty or error states on the dashboard are each a
     `--url` with a query: see "Check it" in
     `references/dashboard-filters-and-tabs.md`. Never hand the designer
     links to click instead.

3. Reset. No tool can press the chooser's "Reset this prototype's data"
   button, so this is the one thing to ask the designer: open
   `http://localhost:3103/`, press it under the release, then open the page
   again: anything they added (a transporter, a template) is gone and the
   starter rows are back. If the designer is not there, say you could not
   press Reset yourself and they should try it once. Do not hold the change
   back for it.

Read the key screenshots in the gallery yourself before describing them.
Never claim something looks right without looking.

### When a check fails

Fix it and run the same check again. Try at most 3 times per failing check.
The usual causes:

- "is not wrapped for designers": the release's gateway still says
  `configureRecords(SET_ID, records)` (step 3).
- "No set context": a fake was called outside a request, for example at the
  top of a file. Call fakes inside a handler.
- `set-isolation` in `npm run lint`: an import reaches into another set. Copy
  the file into the release instead.
- A 404 on a new page: its routes are missing from `allRoutes`, or the path in
  a link is missing the release's address (use `dashboardPath()`, `pagePath()`
  or `hubPath()` from `shared/paths.js`, never a hand-written `/`).

After 3 tries, stop and explain what is failing in plain English, list the
files you changed, and offer to undo: "say 'throw away what I just did' and I
will undo it" (`share-my-change` does this). If the failure is in a file you
did not touch, say "this is not caused by your change: tell the maintainer".

## Step 7: Flag the fake

Add one row per fake to the release's `design-gaps.md` (create it with the
heading and table header in
`.claude/skills/match-the-design/references/design-gaps.md` if it does not
exist). Put "Needs a real service:" at the start of the "Why" cell. For
example:

```text
| transporter | Search saved transporters and add a new one | Fake transporters service (`src/server/prototype-services/transporters`) | Needs a real service: plants-frontend has no transporter register, so a real one needs an API to search, read and add transporters. | GB prototype transporter page |
```

Each fake's own "needs a real service" sentence is in its `index.js`
(`SERVICE.needsARealService`): reuse it.

## Step 8: Tell the designer

Report in this shape:

```
Done: <one line saying what changed, in the designer's words>.

Reference: <reference name>
Pages changed: <page names>
Fake: <fake name> — needs a real service: <one line>
See it: http://localhost:3103/<release>/... (<filtered, empty and error links for a dashboard>)
Gallery: <path printed by designer:show>
Checks: full check passed · Reset clears the fake (or: "please press Reset once to confirm")
Welsh needed: <keys, or "none">

Suggested commit message:
<release>: <what changed, on which pages> (fake: <fake name>)
```

Do not commit. If the designer wants to save it, they say "save my work" and
`share-my-change` commits with that message.

Explain once: on the designer's own computer, a release's notifications and
anything added to a fake are saved in `.cache/designer/data/`, so saving a file
(which restarts the prototype) no longer loses them. Reset clears them. The
deployed prototype keeps them only until it restarts.

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

When they do, the brief lists every fake as "needs a real service", with its
`data.json` as a starting point for the conversation about the real API.

## Doing it without the Workflow tool

This skill has no workflow: every step above runs one after another in any
agent that can run Bash and edit files.

## References

- `references/fake-a-service.md`: the fake service pattern, and the two worked
  examples (transporters and templates)
- `references/dashboard-filters-and-tabs.md`: filters, tabs and counts on a
  release's dashboard
- `references/success-banner.md`: a green banner after an action
- `references/confirm-then-act.md`: a check page before a destructive action
- `references/come-back-to-where-i-was.md`: returning to the page the user
  left
- `references/service-home.md`: a front door across commodities
- `docs/designers/services-and-dashboards.md`: the designer's own guide to all
  of this
