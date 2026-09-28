---
name: example-data
description: Add or change the example notifications a set of the plants prototype starts with, and the extra parties, ports and countries its pages offer - drafts stopped on a chosen page, submitted, late, amended, amendment-cancelled, deleted and copied notifications, another organisation's notifications - each made by replaying the real pages, with a stable link that survives restarts. Use when the designer says "add an example", "show a late notification", "show a submitted / amended / deleted / copied notification", "an example stopped at the X page", "a link straight to the X page", "more addresses in the address book", "add a trader", "add a consignor", "add a port", "add a country", "fill the dashboard" or "another organisation". NOT for changing what a page asks or how it checks answers (use change-the-journey), NOT for wording (use change-the-words), NOT for a lookup or service the stubs do not have, such as transporters or templates (use fake-a-service).
---

# Example data

Makes the example notifications a set starts with, and the extra parties,
ports and countries its pages offer. Every example is made by filling in the
set's **real pages**, the way a trader would, so it can never be something the
journey would refuse. Each example has a **slug**, its stable id, and a link
`/examples/<set-id>/<slug>` that keeps working after a restart.

The full guide, with every kind of example written out, is
[docs/designers/example-data.md](../../../docs/designers/example-data.md).
Read it before your first change in a session.

Talk to the designer in GDS plain English. Say "your design release", not
"set". Say which examples and pages changed, and give the links.

## What goes where

| The designer wants                                                   | Change                                                                                        |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A new example, or a different mix on the dashboard                   | `src/server/prototype-seed/scenarios/<set-id>.js`                                             |
| The same changed answers in several examples                         | a named fixture: `src/server/prototype-seed/fixtures/<set-id>/<file>.json`                    |
| A new party (trader, consignor, consignee, contact), port or country | `src/server/prototype-data/<set-id>/{parties,ports,countries}.json`, or `_all/` for every set |

All of these are the prototype's own. The weekly update never touches them.

## Guard rails

- **Replay, never write records.** An example is a list of page answers. Never
  create a record in code, never call the records store, never edit anything
  under `src/server/app/engine/` or `src/server/app/services/`.
- **Never edit a set's `happy-path.json` for an example.** In
  `high-risk-plants` it belongs to the real service. Use `answers` or a named
  fixture instead.
- **Never edit the stub services' rows** (`src/server/app/services/*/stub*`).
  They belong to the real service. Extra rows go in `src/server/prototype-data/`.
- **Never rename a slug** someone may have shared. Add a new example instead.
- **Never a frozen release.** If `src/server/app/sets/<set-id>/release.json`
  says `"frozen": true`, the release's examples are frozen too: start a working
  release with the `design-release` skill.
- **Check ownership first.** Run `npm run designer:where -- <paths>` on every
  file you will change and follow what it says. If anything is "Belongs to the
  real service", stop and offer "do it in your design release" or `hand-off`.
  Check `overrides.json` if unsure.
- **One Bash command per call.** No `&&`, `;` or pipes. Never `--no-verify`,
  never force-push, never push or open a pull request without asking.

## Steps

### 1. Pick the set and check ownership

1. Use the set the designer names. If they name none, use their working design
   release (`npm run designer:release -- list`). `high-risk-plants` is fine for
   examples: its scenario file is the prototype's own. If they mean "my
   release" and there is none, make one now without asking: `design-release`
   section B (`plants-working`), saved as its own commit, then back here.
2. Run `npm run designer:where -- <each file you will change>`. For a
   scenario file that does not exist yet, name it anyway: it reports "Yours".

### 2. See what is there

```
npm run designer:examples -- list <set-id>
```

It lists each example's slug, label, what it will be (draft, submitted,
amended, deleted) and where it stops. A set with no scenario file shows its four
default examples. To add to them, start the file:

```
npm run designer:examples -- init <set-id>
```

To see which fixtures an example can use, what each is for and which pages it
answers:

```
npm run designer:examples -- fixtures <set-id>
```

It ends with "Where they differ": the pages only some fixtures visit (the
consignor page is only for plants and wood, for example) and the pages that
ask different questions (arrival details asks potatoes for a time and a place
of landing, plants only for a date). Pick the fixture from this list. When the
designer gives a number of examples or research tasks but does not name them,
propose them from this list, one per kind of journey, and say which you chose.

### 3. Make the change

**An example.** Add one entry to `src/server/prototype-seed/scenarios/<set-id>.js`,
following the grammar at the top of `src/server/prototype-seed/grammar.js`:

| Request                                         | Entry                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "stopped at the X page", "a link straight to X" | `fixture` + `through: '<page address>'`                                                                                                                       |
| "submitted"                                     | `submit: true`                                                                                                                                                |
| "late"                                          | `fixture: 'warePotatoesLate'` + `submit: true`, or any fixture with `answers: { 'arrival-details': { arrivalDate: { daysFromToday: -1 } } }` + `submit: true` |
| "amended"                                       | `submit: true, amend: true`                                                                                                                                   |
| "amendment cancelled"                           | `submit: true, amend: true, cancelAmend: true`                                                                                                                |
| "deleted"                                       | `delete: true`                                                                                                                                                |
| "copied"                                        | `copy: '<slug of an earlier example>'`, plus `answers` for what differs                                                                                       |
| "another organisation"                          | `organisationId: '<organisation id>'`                                                                                                                         |
| "fill the dashboard"                            | several entries, each with a different fixture or `answers`                                                                                                   |
| "an example that takes the other branch"        | `fixture: '<the scenario that answers the other way>'`: any scenario in the happy path can be an example, not only the first four                             |

Write `fixture` in the short form, `fixture: 'warePotatoes'`, never
`fixture: { file: 'happy-path', name: 'warePotatoes' }`. The long form
repeated on five examples breaks a code rule (`sonarjs/no-duplicate-string`)
and the save is refused. `init` writes the short form.

The same rule counts every string of 10 or more characters written 3 or
more times in the scenarios file: a page address (`'arrival-details'` as the
`through` of three research tasks), an answers key, or a label. When a string
would appear a third time, name it once at the top of the file and use the
name:

```js
const ARRIVAL_DETAILS = 'arrival-details'

export const examples = [
  {
    label: 'Task 1: potatoes, at arrival details',
    slug: 'arrival-task-1',
    fixture: 'warePotatoes',
    through: ARRIVAL_DETAILS
  },
  ...
]
```

Check for this before running `designer:check`: `grep -c "'<the string>'"`
on the file prints how many times it is there.

- Page addresses are the `slug` values in the set's
  `journeys/linear/flow/fixtures/happy-path.json`, for example `origin`,
  `arrival-details`, `commodities/details`. Only pages the fixture visits can
  be used for `through` and `answers`.
- Field names come from that fixture, and from the page's `controller.js`
  (and `fields.js` where it has one) under
  `src/server/app/sets/<set-id>/journeys/linear/features/<page>/`. Never guess
  a field name.
- Give each example a short slug in lower-case words joined by hyphens, and a
  label in the designer's words.
- Say plainly when a request cannot be shown as asked:
  - A deleted notification is never listed on the dashboard; its link shows the
    dashboard's "deleted" banner.
  - The real plants service has no "Copy as new" button; a copied example is a
    new draft with the same answers, and nothing on screen says it was copied.

**A party, port or country.** Add a row to the right JSON list in
`src/server/prototype-data/<set-id>/` (or `_all/`). The shapes are in the guide
and in `src/server/prototype-data/rows.js`. Every id or code must be new. A
party's `country` is the country's name, such as `France`. To use a new party
or port in an example, give its id or code in `answers`.

### 4. Check the examples

```
npm run designer:examples -- check <set-id>
```

Every example must say "Reached". A "Stopped" line quotes the page:
`Example '<label>' stopped at <page>: the page said '<message>'`. Change that
example's `answers` for that page to satisfy the message, and check again. At
most 3 tries, then stop and explain to the designer what the page wants. An
extra country refused on the origin page is the real rule for that commodity:
suggest another country or another fixture.

### 5. Check the change

```
npm run designer:check -- --set <set-id>
```

It runs the code rules on the scenario file too, and names the file, line and
rule of each error. Explain any failure in plain English and fix it (the
`check-my-change` skill explains every message).

### 6. Show it

Tell the designer: "Saving restarted the prototype. Open the set while signed
in, or press **Reset this prototype's data** under it on
`http://localhost:3103/`, and the examples are made again."

Then take the pictures: the dashboard (pictured with every example on it,
before and after), and where each new example's link lands:

```
npm run designer:show -- --set <set-id> --pages dashboard --examples <new slugs, comma-separated> --before
```

Read the key PNGs yourself before you describe them. Never claim a visual
result you have not looked at. (An example made for another organisation is
not on the dashboard pictures: they are taken as the example-data user.)

### 7. Give the links

```
npm run designer:examples -- links <set-id>
```

Give the designer the new examples' links. For another organisation's example,
the link signs in as that organisation first (on their computer only; on the
deployed prototype they sign in as a test user in that organisation).

A link opens the page the example stopped at. Add `?page=<page>` to open
another page of the same notification: `?page=task-list`, or
`?page=notification-view` for check your answers. Use these in pull requests
and research sheets to link straight to the page that changed.

## Verify

- `npm run designer:examples -- check <set-id>` reports every example as
  "Reached".
- `npm run designer:check -- --set <set-id>` passes.
- The gallery from `designer:show` shows the new example on the dashboard
  (with a red "Late" tag for a late one) and its stop page filled in up to
  that page.
- Each new link opens the right page after a restart.

## Hand-off

Examples never ship: the real service's notifications come from real traders.
New parties, ports or countries the design depends on go in the hand-off brief
as test-data rows for the real team.

End with: "If this should become part of the real service, say 'hand this to
the real team' and I will prepare a brief and a patch for the plants-frontend
team."

## Without the npm scripts

If `designer:examples` is not in `package.json` yet, run the same script
directly: `node src/server/prototype-seed/cli/index.js <list|check|links|init|fixtures> <set-id>`.
