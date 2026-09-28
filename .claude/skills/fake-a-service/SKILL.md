---
name: fake-a-service
description: 'Build the things the real plants service cannot do yet, inside a design release, as prototype-owned services on the real services'' own pattern (src/server/app/services/<name>/ with index.js, client.js, stub.js and a test, made with npm run designer:service), each flagged "needs a real service" with the API a developer would build: a transporter lookup or saved transporters, notification templates, a new lookup or saved list the design needs, address book pages (list, add an address by hand, change or delete one, address categories), a "Copy as new" action, dashboard filters, tabs and counts, a success banner after an action, a "confirm before deleting" page, "come back to where I was" after a side trip, and a home page across plants, animals and products. Use when a designer says "the real service can''t do that yet", "add a transporter lookup", "saved transporters", "save a vehicle they use a lot", "let them upload a file", "a lookup for…", "templates", "save as a template", "start from a template", "change the address book", "add an address manually", "delete an address", "address categories", "copy as new", "copy this notification", "start from a previous notification", "fake a service", "add filters to the dashboard", "add tabs to the dashboard", "add counts to the dashboard", "filter to only the late ones", "how many are late", "a success banner after …", "confirm before deleting", "are you sure page", "come back to where I was", "return to the page I came from", "a home page across plants, animals and products". NOT for extra starter rows the stubs already serve, such as more addresses to pick from, ports, countries or example notifications (use example-data), NOT for adding or changing a question in the journey (use change-the-journey), NOT for layout only (use match-the-design).'
---

# Build what the real service cannot do yet

You are helping an interaction or content designer show something the real
plants service cannot do yet. They know HTML, Nunjucks and the GOV.UK Design
System. They are not JavaScript architects. Reply in GDS plain English: short
sentences, active voice, and say what changed on which pages.

Most of the old prototype's recent work was like this: address book,
transporters, templates, dashboards with tabs and counts. The real plants
service has none of those yet. This skill builds them the way the real
service would: the pages in the designer's own design release, from the
GOV.UK toolbox, and the data behind them as a **prototype-owned service** in
`src/server/app/services/<name>/`, in the same `index.js`, `client.js` and
`stub.js` shape as the real services. So the pages read like the real thing,
and a developer can take the service's `index.js` and `client.js` as they
are.

Words to use with the designer:

- "your design release", not "set" or "plugin"
- "a stand-in service": a service the prototype owns, with made-up data,
  standing in for a real service that does not exist yet
- "needs a real service": the flag every stand-in service carries into the
  hand-off, with the API a developer would build

## Guard rails

Read these before every run. Breaking one is a failure even if every check
passes.

- **Only in a design release the designer owns, and its services.** Every
  file you change is under `src/server/app/sets/<release>/`, is the
  release's own gateway `src/server/app/routes-<release>.js` (step 3 only),
  or is in a **prototype-owned service folder**: a folder under
  `src/server/app/services/` that `overrides.json` lists on its own line in
  `ours` (today `transporters`, `templates`, `ins-address-book` and
  `notification-search`). A new one is made only with
  `npm run designer:service -- new` (`references/fake-a-service.md`, "Making
  a new service"). Run `npm run designer:where` on every path before you edit
  it (step 3). Anything not in `ours` belongs to the real service: the weekly
  update overwrites it or clashes with it.
- **Never in high-risk-plants.** It is the real service's journey and must
  behave exactly as plants-frontend does. Never wrap its records, never
  import a prototype-owned service from it. If asked, offer to make the
  change in a design release (`design-release`), and say a real one needs
  the plants team (`hand-off`).
- **Never in a frozen release.** Offer a working copy of it instead.
- **Never a route at the server root.** A release's routes are mounted under
  `/<release>` by its gateway. Never touch `src/server/router.js`,
  `src/server/sets-index/**` or `src/server/prototype-sets/**` to add a page.
- **Every prototype-owned service says "needs a real service".** Say it to
  the designer. Add a row to the release's `design-gaps.md` for it (step 7).
  Keep its `CONTRACT` in `index.js` up to date as the design settles: the
  hand-off turns it into the API a developer builds.
- **Never edit shared code**, except a prototype-owned service folder. Not
  `src/server/app/{engine,model,bridge,flow,shared,lib}/**`, any other folder
  in `src/server/app/services/` (such as `address-book`, `countries`,
  `ports`, `persistence`), `src/client/**`, `webpack.config.js` or another
  set's folder. A release never imports from another set: copy what you need
  into the release.
- **Pages never import `src/server/prototype-support/`.** It is stub
  plumbing: only a service's `stub.js` and a release's gateway import it.
  `index.js` and `client.js` never do, so a developer can copy them across
  unchanged.
- **GOV.UK toolbox only.** Nunjucks macros and `govuk-*` classes. No Sass, no
  inline styles, no new client JavaScript, no webpack entries. The MoJ filter
  and the GOV.UK Tabs script are not loaded here: see
  `references/dashboard-filters-and-tabs.md`.
- **English and Welsh together.** Every new string goes in `copy.en.js` and
  `copy.cy.js` with the same keys. With no Welsh from the designer, write
  `'[Welsh needed] <the English>'`.
- **No test files in a release.** Never create `*.test.js` or
  `*.fit.spec.js` inside `sets/<release>/`. A prototype-owned service is the
  exception: it keeps its `<name>.test.js` beside it, and you extend it when
  you change the service.
- **One change at a time.** A request with two or three parts is done part by
  part in this run, each checked before the next. A request that needs other
  skills too follows "Requests that need more than this skill" below. For a
  list of notes (a crit, feedback) or four or more changes, start the
  `design-session` workflow (`AGENTS.md`, "Workflows"). Never make the
  designer ask again for a part they already asked for.
- **One Bash command per call.** Install only with the command
  `npm run designer:preflight` prints (today `npx --yes npm@11.6.2 ci`).
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
`high-risk-plants`, `sample-journey` (the placeholder: never change it; its
saved transporters pages are a working example to copy from), or a frozen
release.

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
3. **The service and its pages**: this skill.
4. **A journey page for it** (a lookup page that collects an answer):
   `change-the-journey`'s add-a-page recipe, as step 5 says. **When the page
   the designer names does not exist** ("pick it on the transport page", and
   the journey has no transport page), add it with that recipe in the shape
   of worked example 1, at the likeliest place in the flow, and say so in one
   line ("There was no transport page, so I added one after arrival
   details").
5. **Matching a Figma frame**: `show-my-change` with `--reference`, last, once
   the page exists. `match-the-design` for any layout tweaks it shows.

For example, "make my dashboard look like this Figma, filled with examples":
1 if needed, then 2 (a late, a submitted and an amended example), then
`references/dashboard-filters-and-tabs.md`, then 5 with the Figma frame
beside the dashboard picture.

**Where the save happens.** Step 1's new release is saved at once, as its own
commit (`design-release` section B). Nothing else is saved by this skill or
the ones it calls: the example data, the service, the pages and any layout
tweak stay unsaved until the designer says "save my work" (or already asked
for a save or a pull request in the same message, which is the yes). Then
`share-my-change` saves them, one commit per part when they touch different
files, with the suggested messages from each part's report. A new service's
folder and its `ours` line in `overrides.json` go in the same commit.

## Step 2: Pick the reference

Match the request to one reference and read all of it before you edit:

| The designer wants                                                                                                                              | Read                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A lookup, a saved list, "add a new one": transporters, templates, or anything the real service would fetch from a service it does not have      | `references/fake-a-service.md`                                 |
| Something no service here does yet (a saved vehicle, an upload register, a new lookup)                                                          | `references/fake-a-service.md`, "Making a new service"         |
| A list of options only the release's own new question offers, which no backend would keep                                                       | `references/fake-a-service.md`, "Journey words a release owns" |
| Address book pages: a list, add an address by hand, change or delete one, address categories (flag: belongs to the Import Notification Service) | `references/address-book-pages.md`                             |
| "Copy as new" on the dashboard, "start from a previous notification" (not a new service: the backend copies already)                            | `references/copy-as-new.md`                                    |
| Filters, tabs or counts on the dashboard, including a late filter, tab or count (the red Late tag itself is already on the real dashboard)      | `references/dashboard-filters-and-tabs.md`                     |
| A green "done" message after an action                                                                                                          | `references/success-banner.md`                                 |
| "Are you sure?" before deleting, cancelling or discarding                                                                                       | `references/confirm-then-act.md`                               |
| Go off to another page (add a transporter, change an answer) and land back where you were                                                       | `references/come-back-to-where-i-was.md`                       |
| A front door across plants, animals and products                                                                                                | `references/service-home.md`                                   |

If the request is really example data (more addresses to pick from, a late
notification, a filled dashboard, "which ones are overdue" when the red Late
tag the real dashboard shows is enough), stop and use `example-data`. Pages that
change the address book (add, change, delete, categories) are this skill:
`references/address-book-pages.md`. If it is a new question in the journey,
stop and use `change-the-journey`. You can use this skill and then that one:
for example, a transporter lookup page is a service (this skill) registered
as a journey page (`change-the-journey`'s add-a-page recipe).

Before making a new service, check the ones there are:
`npm run designer:service -- list`. Use one that fits; never make a second.

Tell the designer in one line which reference you will follow, what it will
change, and which service stands in for a real one.

**The designer names a component this prototype cannot load.** Say so in
that same opening, one line each, before building, so it is not a surprise
in the pictures:

- "GOV.UK tabs" or `govukTabs`: "The GOV.UK tabs script is not loaded here,
  so the macro would only ever show its first panel. I will build link tabs
  that look the same, one address per tab, and log it as a design gap."
- "the MoJ filter" or "filter layout": "The MoJ filter styles are not loaded
  here. I will build the filters from GOV.UK checkboxes and a button in a
  column beside the results, and log it as a design gap."
- Any other component not in `match-the-design`'s
  `references/components-we-have.md`: name the nearest one that is, from
  `references/nearest-equivalent.md` there.

Then build the nearest equivalent. Never load the script or styles to make
the named component work: that is client JavaScript and Sass, outside the
toolbox.

## Step 3: Check who owns each file

For a new service, make it first, so its folder can answer "Yours":

```bash
npm run designer:service -- new <name> --owner <plants-backend|new-api|ins> --describe "<what the real service would need to do>"
```

It makes the folder and its `ours` line together. Then list every file you
plan to create or change, and run:

```bash
npm run designer:where -- <path> <path> <path>
```

Every path must say "Yours". A file in a prototype-owned service folder says
"Yours" because its folder has its own line in `ours`. If any other path does
not say "Yours", do not edit it.

Check the release's records are wrapped. Open
`src/server/app/routes-<release>.js` and look for:

```js
configureRecords(SET_ID, designerRecords(SET_ID, records))
```

with `import { designerRecords } from '../prototype-support/records.js'`.
`npm run new:set` writes this. If the line says
`configureRecords(SET_ID, records)` instead, the dashboard's
notification-search and Reset will not work for the release. The gateway is
the release's own file, so change that line and add the import.

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
release's own files, or from the saved transporters example in
`src/server/app/sets/sample-journey/journeys/linear/features/saved-transporters/`
(never import from another set). As you go:

- A new service (made in step 3): shape its `stub.js`, `client.js` and
  `CONTRACT` to the design (`references/fake-a-service.md`, "Making a new
  service"). `CONTRACT` holds plain values only, never a name `index.js`
  imports. Choose whether the journey answer stores a copy of the record or
  its id, and whether the page is required ("Store a reference or a copy?"
  and "Required or optional?" there).
- New words go in the feature's `copy/copy.en.js` and `copy/copy.cy.js`.
- A new page in a release gets its route in the release's
  `journeys/linear/features/index.js` `allRoutes`.
- A new page that collects an answer is a journey page: register it with
  `change-the-journey` (the add-a-page recipe), then come back here for the
  service behind it.

Then format what you changed:

```bash
npm run designer:format
```

## Step 6: Check and show it

Run these one at a time. Each must pass before the next.

1. If you made or changed a service, its own test, then the linter:

   ```bash
   npm test -- src/server/app/services/<name> --coverage.enabled=false
   ```

   ```bash
   npm run lint
   ```

2. The full check. It boots the release, so a missing import or route shows
   here:

   ```bash
   npm run designer:check -- --set <release> --full
   ```

3. Show the dashboard and every page you added, before and after. The
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

4. Reset. No tool can press the chooser's "Reset this prototype's data"
   button, so this is the one thing to ask the designer: open
   `http://localhost:3103/`, press it under the release, then open the page
   again: anything they added (a transporter, a template) is gone and the
   starter rows are back, in that release only. If the designer is not
   there, say you could not press Reset yourself and they should try it
   once. Do not hold the change back for it. (Each service's test proves
   Reset clears one release only.)

Read the key screenshots in the gallery yourself before describing them.
Never claim something looks right without looking.

### When a check fails

Fix it and run the same check again. Try at most 3 times per failing check.
The usual causes:

- "is not wrapped for designers": the release's gateway still says
  `configureRecords(SET_ID, records)` (step 3).
- "No set context": a service was called outside a request, for example at
  the top of a file. Call services inside a handler.
- `set-isolation` in `npm run lint`: an import reaches into another set. Copy
  the file into the release instead.
- A 404 on a new page: its routes are missing from `allRoutes`, or the path in
  a link is missing the release's address (use `dashboardPath()`, `pagePath()`
  or `hubPath()` from `shared/paths.js`, never a hand-written `/`).
- A form that shows no errors: the page catches the service's refusal with
  `isValidationFailure(error)` and reads `mapApiErrorsToFormErrors(error.body)`;
  a field name that differs from the service's is never reported.

After 3 tries, stop and explain what is failing in plain English, list the
files you changed, and offer to undo: "say 'throw away what I just did' and I
will undo it" (`share-my-change` does this). A new service is undone with
`npm run designer:service -- retire <name>`. If the failure is in a file you
did not touch, say "this is not caused by your change: tell the maintainer".

## Step 7: Flag the service

Add one row per prototype-owned service the release uses to its
`design-gaps.md` (create it with the heading and table header in
`.claude/skills/match-the-design/references/design-gaps.md` if it does not
exist). Put "Needs a real service:" at the start of the "Why" cell. For
example:

```text
| transporter | Search saved transporters and add a new one | Prototype-owned service `transporters` (`src/server/app/services/transporters`) | Needs a real service: plants-frontend has no transporter register, so a real one needs an API to search, read, add and delete transporters (its CONTRACT). | GB prototype transporter page |
```

Each service's own sentence is `NEEDS_A_REAL_SERVICE` in its `index.js`:
reuse it. `npm run designer:service -- list` prints them all.

## Step 8: Tell the designer

Report in this shape:

```
Done: <one line saying what changed, in the designer's words>.

Reference: <reference name>
Pages changed: <page names>
Stand-in service: <name> — needs a real service: <one line>
See it: http://localhost:3103/<release>/... (<filtered, empty and error links for a dashboard>)
Gallery: <path printed by designer:show>
Checks: service test and lint passed · full check passed · Reset clears it (or: "please press Reset once to confirm")
Choices I made: <reference or copy; required or optional; any page I added because it did not exist>
Welsh needed: <keys, or "none">
Saved: <"Your new working release is saved; this change is not yet: say 'save my work'" when step 1 made a release, else "Not yet: say 'save my work'">

Suggested commit message:
<release>: <what changed, on which pages> (stand-in service: <name>)
```

Do not commit, unless the designer already asked for a save in their
message. If the designer wants to save it, they say "save my work" and
`share-my-change` commits with that message.

Explain once: on the designer's own computer, a release's notifications and
anything added to a stand-in service are saved in `.cache/designer/data/`, so
saving a file (which restarts the prototype) no longer loses them. Reset
clears them. The deployed prototype keeps them only until it restarts.

End with the hand-off line, word for word:

"If this should become part of the real service, say 'hand this to the real
team' and I will prepare a brief and a patch for the plants-frontend team."

When they do, the brief describes each prototype-owned service the release
uses as a service to build, from its `CONTRACT`, and proposes its `index.js`
and `client.js` as they are.

## Doing it without the Workflow tool

This skill has no workflow: every step above runs one after another in any
agent that can run Bash and edit files.

## References

- `references/fake-a-service.md`: prototype-owned services, the two worked
  examples (transporters and templates), making a new one with
  `designer:service`, and journey words a release owns
- `references/address-book-pages.md`: address book pages on the
  `ins-address-book` service, which the journey's pickers follow
- `references/copy-as-new.md`: a "Copy as new" action and its check page, on
  the engine's own copy
- `references/dashboard-filters-and-tabs.md`: filters, tabs and counts on a
  release's dashboard, on the `notification-search` service
- `references/success-banner.md`: a green banner after an action
- `references/confirm-then-act.md`: a check page before a destructive action
- `references/come-back-to-where-i-was.md`: returning to the page the user
  left
- `references/service-home.md`: a front door across commodities
- `docs/designers/services-and-dashboards.md`: the designer's own guide to all
  of this
