# Example data

Example data is the set of notifications a prototype already has when you open
it: drafts, submitted ones, a late one, an amended one and so on. It makes the
dashboard look real and gives you a link straight to any page, already filled
in.

You do not need to write code to change it. Ask Claude Code, for example:

- "Add an example stopped at the origin page."
- "Show a late notification on the dashboard."
- "Add a consignor called Green Leaf Imports Ltd."
- "Give me a link straight to check your answers."

Claude uses the `example-data` skill. This page explains what it does, so you
can check it or do it yourself.

## How examples are made

Every example is made by filling in the real pages, one after another, the way
a trader would. Nothing is typed into a database. That means:

- an example always looks exactly like a notification a trader made
- if a page would refuse the answers, the example is refused too, and you are
  told what the page said
- when a page changes, the examples follow it

Examples are made the first time someone signs in and opens a set after the
prototype starts, and again when someone presses **Reset this prototype's
data** on the prototypes page (`http://localhost:3103/`). Everyone who signs
in sees the same shared examples.

Saving a file restarts the prototype on your computer. That clears everything,
including your own test notifications. The examples come back on your next
visit.

## Where examples live

| What                               | Where                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- |
| A set's examples                   | `src/server/prototype-seed/scenarios/<set-id>.js`                                                  |
| The answers they use               | the set's happy path: `src/server/app/sets/<set-id>/journeys/linear/flow/fixtures/happy-path.json` |
| Your own answer sets               | `src/server/prototype-seed/fixtures/<set-id>/<name>.json`                                          |
| Extra parties, ports and countries | `src/server/prototype-data/_all/` (every set) or `src/server/prototype-data/<set-id>/` (one set)   |

Everything in these folders is yours: the weekly update never changes it.

A design release copied from `high-risk-plants` gets five examples without a
scenario file: a draft just started, a draft part way through, a submitted one,
a submitted then amended one, and one submitted late (so the dashboard shows
its Late tag). The other four of the real journey's nine (a cancelled
amendment, a copy, a deleted one, another organisation's) need a scenario
file. To add your own, start its scenario file first:

```
npm run designer:examples -- init <set-id>
```

`high-risk-plants` has its own scenario file with nine examples, covering every
kind below.

To see the fixtures you can use, what each is for, the pages it answers and
where they differ (which pages only plants visit, which questions only
potatoes are asked):

```
npm run designer:examples -- fixtures <set-id>
```

Write `fixture` as a plain name, `fixture: 'warePotatoes'`. The longer
`{ file: 'happy-path', name: … }` form, repeated on many examples, breaks a
code rule and stops the save: use it only when the same name is in two
fixture files.

## Writing an example

A scenario file is a list. Each example is one entry:

```js
export const examples = [
  {
    label: 'Submitted late (the potatoes arrived yesterday)',
    slug: 'submitted-late',
    fixture: 'warePotatoesLate',
    submit: true
  }
]
```

| Part             | What it does                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`          | What you call it. Shown on the prototypes page and in the checks.                                                                                                                                             |
| `slug`           | Its short id, in lower-case words joined by hyphens. Its link is `/examples/<set-id>/<slug>`. **Never rename a slug someone may have shared.**                                                                |
| `fixture`        | Which set of answers to fill the pages in with, by name, from the happy path or your own fixture files. If the same name is in two files, say which: `fixture: { file: 'happy-path', name: 'seedPotatoes' }`. |
| `through`        | Stop on this page and leave it for you to fill in. Every page before it is answered. Use the page's address, for example `'origin'` or `'commodities/details'`.                                               |
| `answers`        | Change single answers without a new fixture: `{ 'origin': { countryOfOrigin: 'CY' } }`. The outer name is the page's address, the inner names are the page's form fields.                                     |
| `submit`         | `true` sends it: check your answers, then the declaration.                                                                                                                                                    |
| `amend`          | `true` then starts an amendment (needs `submit`).                                                                                                                                                             |
| `cancelAmend`    | `true` then cancels the amendment (needs `amend`).                                                                                                                                                            |
| `delete`         | `true` then deletes it.                                                                                                                                                                                       |
| `copy`           | Start from another example's answers, by its slug. The copy is a new draft. Add `answers` to change some of them.                                                                                             |
| `organisationId` | Make it for one organisation only. Only people signed in to that organisation see it.                                                                                                                         |

Leave out anything you do not need.

### Examples of each kind

```js
// A draft stopped on the origin page: a link straight to that page.
{ label: 'Ready for origin', slug: 'at-origin', fixture: 'warePotatoes', through: 'origin' }

// A late notification. warePotatoesLate arrived yesterday, so the service
// marks it late when it is sent, and the dashboard shows a red Late tag.
{ label: 'Late potatoes', slug: 'late-potatoes', fixture: 'warePotatoesLate', submit: true }

// The same fixture, but late because of the date you give it.
{
  label: 'Seed potatoes, arrived 3 days ago',
  slug: 'late-seed-potatoes',
  fixture: 'seedPotatoes',
  answers: { 'arrival-details': { arrivalDate: { daysFromToday: -3 } } },
  submit: true
}

// Submitted, then an amendment started.
{ label: 'Being amended', slug: 'being-amended', fixture: 'woodWithoutBark', submit: true, amend: true }

// An amendment started and then cancelled: it goes back to submitted, and
// its link shows the "amendment cancelled" banner.
{ label: 'Amendment cancelled', slug: 'amendment-cancelled', fixture: 'woodWithoutBark', submit: true, amend: true, cancelAmend: true }

// Deleted. A deleted notification is not listed on the dashboard; its link
// opens the dashboard with the "deleted" banner.
{ label: 'Deleted draft', slug: 'deleted', fixture: 'warePotatoes', delete: true }

// A copy of another example, arriving at a different port.
{ label: 'Copied', slug: 'copied', copy: 'submitted', answers: { 'arrival-details': { proposedPlaceOfLanding: 'GB FXT' } } }

// Another organisation's notification.
{ label: 'Their notification', slug: 'their-notification', fixture: 'seedPotatoes', submit: true, organisationId: 'example-organisation-b' }
```

Dates are `{ daysFromToday: 7 }` (a week from today), `{ daysFromToday: -1 }`
(yesterday) or a fixed date as `'27/9/2026'`. A relative date keeps the example
the same every day; a fixed one goes out of date.

### Filling the dashboard

Add as many examples as the design needs. The dashboard shows 20 notifications
to a page, newest first, so more than 20 gives you a second page. Examples are
made in the order they are listed.

### Your own answer sets (named fixtures)

When several examples share the same changed answers, put them in a named
fixture instead of repeating `answers`. Make
`src/server/prototype-seed/fixtures/<set-id>/<file>.json`:

```json
{
  "seedPotatoesToFelixstowe": {
    "from": "seedPotatoes",
    "answers": {
      "arrival-details": { "proposedPlaceOfLanding": "GB FXT" }
    }
  }
}
```

`from` names a fixture in the happy path; `answers` changes it. A named fixture
can also list every page itself with `steps`, in the same shape as the happy
path. Never edit the happy path itself for an example: in `high-risk-plants` it
belongs to the real service.

## Example links

Each example has a link that keeps working after the prototype restarts or is
reset, even though the reference number changes:

```
http://localhost:3103/examples/<set-id>/<slug>
```

It opens the page the example stopped on: the `through` page for a draft, the
confirmation page for a submitted one, check your answers for a cancelled
amendment, the task list for an amendment, and the dashboard for a deleted
one. Sign in first.

Add `?page=<page>` to open another page of the same notification:
`?page=task-list` for the task list, `?page=notification-view` for check your
answers, or any page's address such as `?page=arrival-details`. Handy for
pull requests and research sheets that point at one page.

To print every link for a set:

```
npm run designer:examples -- links <set-id>
```

Add `--base <address>` to print the deployed prototype's links instead, for
example `--base https://<the deployed prototype's address>`.

## Another organisation

An example with `organisationId` is made signed in to that organisation, and
only people signed in to it see it. The shared examples are shown to everyone.

On your computer, sign in as an organisation with:

```
http://localhost:3103/auth/stub-sign-in?organisationId=example-organisation-b
```

To go back, sign out (`http://localhost:3103/auth/sign-out`) and sign in again.
The deployed prototype signs in the same way, with the same stub sign-in: use
the same `?organisationId=` link against its own address instead of
`localhost:3103`.

## Extra parties, ports and countries

The address book, the ports and the countries come from stub lists that belong
to the real service. To add your own, create a JSON file in
`src/server/prototype-data/`:

- `_all/parties.json`, `_all/ports.json`, `_all/countries.json`: every set
- `<set-id>/parties.json` and so on: one set only

Your rows appear after the stub rows. Each file is a list:

```json
[
  {
    "id": "green-leaf-imports-ltd",
    "name": "Green Leaf Imports Ltd",
    "addressLine1": "5 Quay Street",
    "townOrCity": "Bristol",
    "postalOrZipCode": "BS1 4DJ",
    "country": "United Kingdom"
  }
]
```

| Kind                 | Fields                                                                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Party (address book) | `id` (lower-case words joined by hyphens), `name`, `addressLine1`, `townOrCity`, `country` (its name, like `France`); optional `postalOrZipCode`, `telephoneNumber`, `emailAddress` |
| Port                 | `code` (like `GB XPT`) and `name`                                                                                                                                                   |
| Country              | `code` (two capital letters, like `XK`) and `name`                                                                                                                                  |

Every id and code must be new: one the stub or another of your files already
uses is refused. A party appears in every address book search and picker.

To use a new party in an example, give its id as the answer, for example
`answers: { 'consignors/select': { consignor: 'green-leaf-imports-ltd' } }`.

The real rules still apply. The origin page refuses a country the commodity
cannot come from (some plants only come from certain countries), even one you
added. If an example stops there, choose another country.

## Checking your examples

```
npm run designer:examples -- check <set-id>
```

This makes every example on a private copy of the prototype and says, for
each, "Reached" or "Stopped". A stopped example says which page stopped it and
what the page said, for example:

```
Stopped  at-origin: Example 'Ready for origin' stopped at origin: the page said 'Select the country where the consignment originates from'
```

Fix the example's `answers` to satisfy the page, then check again. It also
checks your extra parties, ports and countries files.

`npm run designer:examples -- list <set-id>` lists the examples and what each
one will be, without making them.

## If something goes wrong

| You see                                | What it means                                                             | What to do                                         |
| -------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| "stopped at <page>: the page said '…'" | The page refused the example's answers, as it would refuse a trader.      | Change the example's `answers` for that page.      |
| "The examples in … need fixing"        | The scenario file is written wrongly. Each problem is listed.             | Fix each line it lists.                            |
| "… is not valid JSON"                  | A missing comma or quote in a JSON file.                                  | Fix the file it names.                             |
| "… which already exists"               | An id or code is used twice.                                              | Choose another.                                    |
| The dashboard has no examples          | Nobody has opened the set since it restarted, or seeding is switched off. | Open the set while signed in, or press Reset.      |
| An example link says "not found"       | No example has that slug in that set.                                     | Run `npm run designer:examples -- links <set-id>`. |

## Making it real

The real service has no example data: its notifications come from real
traders. If a new party, port or country matters to the design, the real team
needs it as test data. Say "hand this to the real team", and the brief will
list your rows as test data for them.
