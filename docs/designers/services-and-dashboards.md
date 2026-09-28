# Services and dashboards

How to show things the real plants service cannot do yet: saved transporters,
notification templates, a new lookup or saved list, address book pages, "Copy
as new", dashboard filters, tabs and counts, success messages, "are you
sure?" pages, and a home page across commodities.

Just say what you want, for example "add a transporter lookup", "let
importers save a vehicle they use a lot and pick it next time" or "add tabs
to the dashboard". You do not need to know how it is built: Claude works that
out and does it with you.

## Why this is different from the old prototype

In the old Prototype Kit prototype, anything could be faked in a route file:
a list of transporters, a templates page, counts on a dashboard. Here, the
pages are the real service's pages, running on the real service's engine.
That makes them far closer to what will ship, but the real service only does
what it does today. It has no transporter register, no templates, and its
dashboard cannot filter by status.

So when a design needs something the real service does not have, Claude
builds a **stand-in service** for it. It is built exactly the way the real
service builds its own services, in the same place and the same shape, with
made-up data behind it. So:

- your pages work like real pages: a search really searches, a form really
  refuses what is missing, and the next page is really there
- the developers can take the stand-in's code as the start of the real thing,
  and your hand-off says exactly what service they need to build

Every stand-in service carries a flag: **needs a real service**. You use it in
your own design release, never in the real journey.

## What you can have

| You want                                                                  | What you get                                                                                        | Needs a real service?                    |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Search saved transporters, pick one, add a new one                        | A transporter picker page, built like the address book picker, with 7 made-up transporters to start | Yes: transporters                        |
| Save a notification as a template, start a new one from it                | A "Save as template" action on each dashboard card, a templates page, "Use this template"           | Yes: templates                           |
| Something else the real service cannot do (a saved vehicle, a new lookup) | A new stand-in service with made-up rows, and the pages that use it                                 | Yes: a new one, named for what it holds  |
| Filters on the dashboard                                                  | Status, commodity, late only and arrival dates, in a panel beside the list                          | Yes: the backend cannot filter yet       |
| Tabs on the dashboard                                                     | A link per tab with its count, for example "Drafts (3)"                                             | Yes, and a design gap (see below)        |
| Counts on the dashboard                                                   | How many in each status, each tab and late                                                          | Yes                                      |
| A green "done" message after an action                                    | A success banner, like the one after deleting a notification                                        | No                                       |
| "Are you sure?" before deleting                                           | A check page with a red button, like "delete notification"                                          | No, but what it deletes may be           |
| Go off to add something and come back                                     | Back to the list with the new thing ticked, or back to check your answers                           | No                                       |
| A home page across plants, animals and products                           | A small set of its own with a card per commodity                                                    | It belongs to another service: see below |
| Address book pages: add an address by hand, change or delete one          | A list, an add page and an "are you sure?" page; the journey's pickers see the change               | It belongs to another service: see below |
| Address categories ("what is this address used for")                      | A checkbox question on the add page, shown on the list                                              | Yes, and a design question (see below)   |
| "Copy as new" on the dashboard                                            | An action on each card, a check page, and the new draft's task list with a banner                   | No: the backend can copy already         |

**See one working.** Open `http://localhost:3103/sample-journey/transporters`
while the prototype is running. It is a small example: search the saved
transporters, page through them, add one (try saving it empty to see the
errors), delete one, then press "Reset this prototype's data" under "Sample
journey" on the prototypes page to put them back.

## Your data survives a restart

Saving a file restarts the prototype on your computer. On your own computer,
a design release keeps:

- every notification in it, with the same reference numbers, so your
  dashboard and your example links still work
- anything added to a stand-in service: transporters, templates, addresses

They are kept in the `.cache/designer/data/` folder. Git ignores that folder,
so it is never saved into a change or shared.

**Reset** ("Reset this prototype's data" under your release on the
prototypes page) empties all of it, for that release only: notifications,
added transporters, saved templates, added or deleted addresses. The
examples and starter rows come back. Your other releases are not touched,
the way one organisation's data in a real service never touches another's.

This only happens on your own computer (`npm run dev`). The deployed
prototype keeps everything in memory until it next restarts. The real
journey, high-risk-plants, works exactly as the real service does and keeps
nothing.

To switch it off for a session, ask Claude to start the prototype fresh
(`npm run designer:fresh`). It is the same prototype, but every restart
starts from the examples.

## Tabs and filters look a little different

Two pieces of the design system are not switched on in this service:

- **Tabs.** The GOV.UK Tabs script is not started, so real tabs would show as
  a list of links and then every panel, one after another. You get a link per
  tab instead, with its count. The open tab is in the address, so a research
  link can open "Drafts" directly.
- **The MoJ filter panel.** Its styles are not loaded. You get the same
  controls (checkboxes, a text box, dates, "Apply filters") in a narrow column
  beside the list.

Each goes in your release's `design-gaps.md`, so the real team knows what the
design wanted.

## Needs a real service

Every stand-in service is named in three places:

1. Claude tells you when it builds or uses one.
2. A row in your release's `design-gaps.md` starts "Needs a real service:"
   and says what the real service would have to do.
3. When you hand a change to the real team ("hand this to the real team", or
   "write it up as a story for the developers"), the brief has a "service to
   build" section for each one: what it does, the fields a record has, an
   example, the questions the real team must answer, and the stand-in's own
   code, marked "proposed", as a starting point.

A home page across plants, animals and products is a special case. The real
front door belongs to the Import Notification Service frontend, which also
owns the address book, not to plants. You can build one to test the idea, and
the brief will say whose it is.

The address book is the same. Plants only reads it; adding, changing and
deleting addresses happens in the Import Notification Service frontend.
Address book pages in your release use a stand-in with that service's own
rules and messages, and the journey's pickers see what you add, change or
delete, so you can test the whole round trip. The brief says the change is
for the Import Notification Service team. Categories are also a design
question: the real address book has no categories on purpose, because one
address can be a consignor on one notification and a consignee on the next.

"Copy as new" is the opposite case: the backend can already copy a
notification, and the real team has parked the button. What you build here
could ship as it is.

## What you will be asked

Usually nothing. Claude works out which of your design releases to change
(the one you changed most recently) and asks only if it cannot tell. For a
new stand-in service it picks a short name and says who would own the real
one, and tells you both. It will not build a stand-in service into the real
journey (high-risk-plants) or into a frozen release: it offers to make a
working release instead.

## Seeing it

After each change Claude runs the checks and makes a gallery of pictures.
The gallery shows your dashboard and any new pages, including their error
states and at phone width. Claude also gives you links to try, for example:

- filtered: `http://localhost:3103/<your-release>?status=submitted`
- a tab: `http://localhost:3103/<your-release>?tab=drafts`
- nothing matches: `http://localhost:3103/<your-release>?commodity=nothing-like-this`
- an error: `http://localhost:3103/<your-release>?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026`

For filters to show anything, the dashboard needs notifications in different
states. Ask for examples: "show a late notification", "add a submitted and an
amended example".

## For whoever maintains the prototype

The steps Claude follows are in the workspace `prototype` skill's
fake-a-service reference, at
`~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/fake-a-service.md`.

**Prototype-owned services** live in `src/server/app/services/<name>/`,
beside the real ones and in their shape: `index.js` picks `stub.js` or
`client.js` with `isStubDataMode()`, and exports one function per operation
plus `NEEDS_A_REAL_SERVICE` and `CONTRACT`. Each has its own line in
`overrides.json`'s `ours` (`src/server/app/services/<name>/**`), so the
weekly update leaves it alone and every other services folder stays the real
service's. Today they are:

- `transporters`: a transporter register (a new API).
- `templates`: notification templates (the plants backend).
- `ins-address-book`: a copy of the Import Notification Service frontend's
  address book service. What it changes shows in the journey's pickers,
  which keep reading the real `services/address-book/index.js`: its one
  patched line (`withExtraParties`, in `src/server/prototype-data/`) lays
  the release's changes over the stub book.
- `notification-search`: dashboard filters, tabs and counts (the plants
  backend's list, with filters).

`npm run designer:service -- list` prints each with what it needs. `new
<name> --owner <plants-backend|new-api|ins> --describe "<text>"` makes one
(it refuses a name `upstream/main` already has, and names the real team
removed), and `retire <name>` deletes one and its `ours` line.

`index.js` and `client.js` never import prototype code, so they can move to
plants-frontend unchanged. Only `stub.js` does, from
**`src/server/prototype-support/`**, the stub plumbing:

- `fake-store.js`: `createFakeStore`, rows per release and per organisation,
  saving to `.cache/designer/data/<release>.<name>.json` and Reset;
  `registry.js` is the list of stores Reset empties.
- `search-page.js`: search and paging in the address book picker's shape.
- `records.js`: `designerRecords(setId, records)` wraps a release's records
  store. `npm run new:set` wires it into every release's gateway
  (`src/server/app/routes-<release>.js`). It adds filters and `counts()` to
  the list (read by the `notification-search` stub), fills the Commodity and
  Arrival columns (`derived-columns.js`), saves the release's notifications
  to `.cache/designer/data/<release>.json` in development, and on Reset also
  empties every stub store for that release.
- `address-book.js` and `address-book-changes.js`: the `ins-address-book`
  stub's starting rows, and the link the pickers' view reads its changes
  through.
- `contracts.js`: reads each prototype-owned service's `CONTRACT` for
  `designer:service list` and the hand-off.

Saving happens only when `NODE_ENV` is `development` and neither
`PROTOTYPE_SEED` nor `PROTOTYPE_PERSIST` is `false`. The browser tests and
`designer:show` set `PROTOTYPE_SEED=false`, so they always start empty. The
saved file records which notifications are the release's examples, so a
restart does not make a second copy of them.

**When the real service arrives.** If plants-frontend adds a service folder
with the same name as a prototype-owned one, the weekly update keeps the
prototype's copy, labels its pull request `needs-person`, and its summary
says to retire the prototype one (`designer:service -- retire <name>` on a
`chore/` branch) and take the real one
(`git checkout upstream/main -- src/server/app/services/<name>`).

The saved transporters example lives in the placeholder set,
`src/server/app/sets/sample-journey/journeys/linear/features/saved-transporters/`,
and `fit/designer-sets.fit.spec.js` walks it in the browser: search, paging,
the add form's errors, delete, and Reset of that set only.
