# A guide for designers

This is a working prototype of the high-risk plants import notification
service. It looks and behaves like the real thing, but nothing you do here
is real: there is no real backend and no real data. It is safe to click
anything.

## Running it on your computer

You need Node.js installed. Nothing else — no database, no other services
running, no environment variables to set.

```
npx --yes npm@11.6.2 ci
npm run dev
```

Then open [http://localhost:3103](http://localhost:3103). You sign in with
the real service's own development sign-in, which signs you straight in
without asking for a name or password.

(`npx --yes npm@11.6.2` runs the exact npm version this project expects.
Your own npm may be newer, and a newer npm can refuse to install against this
project's lockfile.)

`npm start` runs the prototype the way it runs when deployed. Like the real
service, it then needs a Defra ID sign-in service to sign you in, so use
`npm run dev` on your own computer.

## The deployed prototype

The deployed prototype signs you in through the Defra ID stub, the same test
sign-in service the real service uses when deployed. Pick any of its test
users. To see the prototype as a different user, sign out and sign in as a
different test user.

## Example data

A prototype with example data (today, high-risk-plants) creates a handful of
example notifications the first time someone opens it after it starts, in a
mix of states: draft, in progress, submitted, and submitted then amended.
They are made by going through the journey itself, so they look exactly like
notifications a trader made. Everyone who signs in sees the same examples,
whichever user they sign in as.

The data is shared. Anyone using the prototype can change or delete what
anyone else has made, and reset it for everyone.

## What a "set" is

This prototype can hold more than one prototype at once. Each one is called
a set. Today there are two:

- **high-risk-plants** — the real high-risk plants and plant products
  notification journey.
- **sample-journey** — a bare-bones placeholder, kept only to prove the
  prototype can host more than one set. It is not a real journey.

Each set lives at its own web address, for example
`http://localhost:3103/high-risk-plants`. A page never appears at more than
one address, and the root address (`/`) is never a set itself — it is
always the chooser.

## The chooser

`http://localhost:3103/` lists every set. From there you can:

- **Open a set** — click its name.
- **Reset a set's data** — once signed in, click "Reset this prototype's
  data" under it. This clears everything anyone has done in that set, for
  everyone, and puts the example notifications back. Use it whenever a demo,
  or a colleague's testing, has left the data in a state you don't want.

The chooser and every set sit behind sign-in, just as the real service's
pages do. Sign-in is on unless someone sets `AUTH_ENABLED=false`; with it
off, `/` and every set disappear. Leave it unset.

## Known gaps

- **The "Address book" link in the header goes nowhere.** The real service
  sends it to a separate service (the Import Notification Service
  frontend), which this prototype doesn't run. Locally it points at
  `http://localhost:3002`, and a deployed prototype will point there too
  unless its environment sets `TRADE_IMPORTS_INS_FRONTEND_URL`.

## Adding a set

Run:

```
npm run new:set -- <your-set-id>
```

for example `npm run new:set -- citrus-fruit`. This copies the
`sample-journey` placeholder, renames everything inside it to your new set's
id, and mounts it — it appears on the chooser automatically, with no further
wiring. The command prints what to do next: replace the placeholder page
with the real journey, and add a description for it.

Copying a different set instead of `sample-journey` (for example, to start
close to the real high-risk-plants journey) is possible with
`npm run new:set -- <your-set-id> --from high-risk-plants`, but that journey
is far larger, so expect more to rename by hand afterwards.

A set id must be lower-case words separated by hyphens, like
`high-risk-plants` — never spaces, capitals or underscores.

## Where to edit pages

Everything a set shows lives under `src/server/app/sets/<set-id>/`:

- **Templates** — the `.njk` files, one per page. These are the HTML and the
  GOV.UK Design System components a page is built from.
- **Copy** — each feature's `copy/copy.en.js` (and `copy.cy.js` for Welsh)
  file. Wording changes almost always belong here, not in the template.

Changing a page's logic — which pages come next, what counts as a valid
answer — is more involved, and belongs in the same feature's `controller.js`
or in the set's `flow/flow.js`. Ask if you're not sure.

## How the weekly sync works

The real service this prototype mirrors — `trade-imports-plants-frontend` —
keeps changing. Every Monday (and any time by hand), a robot:

1. Fetches the real service's latest changes.
2. Merges them into this prototype.
3. Checks everything still works — the code builds, the tests pass, and
   every set on the chooser still opens.
4. Opens a pull request with the result.

Most weeks, that pull request merges itself with nothing for a person to
do. When it can't — because the merge hit a conflict, or something the
robot changed no longer works — the pull request is left open and labelled
**`needs-person`**. That label means: a person needs to look at this pull
request and sort it out before it can merge. If you see one, or a set
you're using has started behaving oddly after a Monday, that's the place to
look.

## How a change reaches the real service

This prototype never sends anything back the other way. If a change you
make here should also happen in the real service, it needs making there
separately: raise it as a normal pull request against
`trade-imports-plants-frontend`. Once that pull request merges into the
real service, the next weekly sync brings it into this prototype
automatically — you don't need to redo it here.

## What never to edit

Some files in this prototype are not really this prototype's own — they
belong to the real service, and the weekly sync will overwrite anything you
change in them. `overrides.json` at the repo root keeps the definitive list,
under two headings:

- **`patched`** — files the prototype has made one small, deliberate change
  to (for example, so it serves example data rather than calling the real
  service's backend). A change
  here needs the same care as a change to the real service itself.
- everything not listed in `overrides.json`'s `ours` list belongs to the
  real service. Only ever edit it if you mean to send that change back to
  `trade-imports-plants-frontend` (see above) — never to fix something only
  for this prototype.

If you're ever unsure whether a file is safe to change, check
`overrides.json` first.
