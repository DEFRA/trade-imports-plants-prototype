# Services and dashboards

How to show things the real plants service cannot do yet: saved transporters,
notification templates, dashboard filters, tabs and counts, success messages,
"are you sure?" pages, and a home page across commodities. Say what you want
to Claude, for example "add a transporter lookup" or "add tabs to the
dashboard", and it follows these steps with you (the `fake-a-service` skill).

## Why this is different from the old prototype

In the old Prototype Kit prototype, anything could be faked in a route file:
a list of transporters, a templates page, counts on a dashboard. Here, the
pages are the real service's pages, running on the real service's engine. That
makes them far closer to what will ship, but the real service only does what
it does today. It has no transporter register, no templates, and its
dashboard cannot filter by status.

So this prototype has **fake services**: pretend data and behaviour that stand
in for a service that does not exist yet. You use them in your own design
release, never in the real journey, and every one carries a flag: **needs a
real service**.

## What you can have

| You want                                                   | What you get                                                                                        | Fake?                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Search saved transporters, pick one, add a new one         | A transporter picker page, built like the address book picker, with 7 made-up transporters to start | Yes: transporters                        |
| Save a notification as a template, start a new one from it | A "Save as template" action on each dashboard card, a templates page, "Use this template"           | Yes: templates                           |
| Filters on the dashboard                                   | Status, commodity, late only and arrival dates, in a panel beside the list                          | Yes: the backend cannot filter yet       |
| Tabs on the dashboard                                      | A link per tab with its count, for example "Drafts (3)"                                             | Yes, and a design gap (see below)        |
| Counts on the dashboard                                    | How many in each status, each tab and late                                                          | Yes                                      |
| A green "done" message after an action                     | A success banner, like the one after deleting a notification                                        | No                                       |
| "Are you sure?" before deleting                            | A check page with a red button, like "delete notification"                                          | No, but what it deletes may be           |
| Go off to add something and come back                      | Back to the list with the new thing ticked, or back to check your answers                           | No                                       |
| A home page across plants, animals and products            | A small set of its own with a card per commodity                                                    | It belongs to another service: see below |

## Your data now survives a restart

Saving a file restarts the prototype on your computer. Before, that emptied
everything: your half-finished notification, the examples, anything you had
added. Now, on your own computer, a design release keeps:

- every notification in it, with the same reference numbers, so your
  dashboard and your example links still work
- anything added to a fake service: transporters, templates

They are kept in the `.cache/designer/data/` folder. Git ignores that folder,
so it is never saved into a change or shared.

**Reset** ("Reset this prototype's data" under your release on the
prototypes page) empties all of it: notifications, added transporters, saved
templates. The examples and starter rows come back.

This only happens on your own computer (`npm run dev`). The deployed
prototype keeps everything in memory until it next restarts, as before. The
real journey, high-risk-plants, works exactly as the real service does and
keeps nothing.

To switch it off for a session, start the prototype with
`PROTOTYPE_PERSIST=false npm run dev` instead of `npm run dev`.

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

Every fake is named in three places:

1. Claude tells you when it builds one.
2. A row in your release's `design-gaps.md` starts "Needs a real service:"
   and says what the real service would have to do.
3. When you hand a change to the real team ("hand this to the real team"),
   the brief lists every page that uses a fake under "cannot ship as it is",
   with the fake's starter data as a starting point for the conversation
   about the real service.

A home page across plants, animals and products is a special case. The real
front door belongs to the Import Notification Service frontend, which also
owns the address book, not to plants. You can build one to test the idea, and
the brief will say whose it is.

## What you will be asked

Usually nothing. Claude works out which of your design releases to change
(the one you changed most recently) and asks only if it cannot tell. It will
not build a fake in the real journey (high-risk-plants) or in a frozen
release: it offers to make a working release instead.

## Seeing it

After each change Claude runs the full check and makes a gallery
(`npm run designer:show`). The gallery shows your dashboard and any new pages.
Some states need a click in the running prototype, and Claude gives you the
links, for example:

- filtered: `http://localhost:3103/<your-release>?status=submitted`
- a tab: `http://localhost:3103/<your-release>?tab=drafts`
- nothing matches: `http://localhost:3103/<your-release>?commodity=nothing-like-this`
- an error: `http://localhost:3103/<your-release>?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026`

For filters to show anything, the dashboard needs notifications in different
states. Ask for examples: "show a late notification", "add a submitted and an
amended example" (the `example-data` skill).

## For whoever maintains the prototype

The code is in `src/server/prototype-services/`, which belongs to this
prototype (it is in the `ours` list of `overrides.json`), so the weekly update
never touches it.

- `records/`: `designerRecords(setId, records)` wraps a release's records
  store. `npm run new:set` wires it into every release copied from
  high-risk-plants (`src/server/app/routes-<release>.js`). It adds filters and
  `counts()` to the list, saves the release's notifications to
  `.cache/designer/data/<release>.json` in development, and on Reset also
  empties every fake. The dashboard helpers are `filtersFromQuery`,
  `listKnownWithFilters` and `countKnown`.
- `transporters/` and `templates/`: the two fakes, each an `index.js`, a
  `data.json` of starter rows and an `index.test.js`.
- `lib/`: what every fake shares: `createFakeStore` (rows per release and per
  organisation, saving and Reset), `searchRecords` (the address book's search
  shape), and the list of loaded fakes for the hand-off.

Saving happens only when `NODE_ENV` is `development` and neither
`PROTOTYPE_SEED` nor `PROTOTYPE_PERSIST` is `false`. The browser tests and
`designer:show` set `PROTOTYPE_SEED=false`, so they always start empty. The
saved file records which notifications are the release's examples, so a
restart does not make a second copy of them.

The records wrapper sits outside `src/server/app`, so the architecture check
(`npm run lint:arch`) does not police it; a release's gateway and dashboard
import it by relative path. If that ever needs to change, the fallback is
`src/server/app/prototype-services/`, added to the `ours` list.
