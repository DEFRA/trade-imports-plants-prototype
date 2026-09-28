# Glossary

The words used in the designer guides and by Claude Code, in plain English.

## Check

A quick test that your change has not broken anything: the words are in both
languages, every page template still works, and the prototype still starts.
Run it with `npm run designer:check -- --set <set-id>`. It answers in plain
English and tells you how to fix anything that fails.

## Design gap

Something a design asks for that the GOV.UK Design System toolbox cannot
build here, such as a custom colour or a change to the header. You build the
closest GOV.UK version and write the gap down in your release's
`design-gaps.md`: the page, what the design wants, what was built instead and
why. Gaps travel with the hand-off so the real team can decide.

## Design release

Your own copy of the journey, where you make design changes freely. It is a
set, made from the real journey (or from another release) when you say
"start a new design release", or with `npm run new:set`. It lives in
`src/server/app/sets/<release-id>/`, for example `plants-dr2`. Everything in
it is yours. Its `release.json` says what it was made from, when, and what it
is for.

A design release is a snapshot: it does not pick up the real team's later
changes. To pick them up, start a fresh release and carry your changes
across.

A release has one of three purposes:

- **working release**: where you make changes day to day. This is the
  default.
- **frozen release**: a snapshot kept as it is, for developers or for the
  record. Nobody changes a frozen release. To carry on, start a working
  release from it.
- **research release**: a release set up for a round of user research. It
  may have research mode on (see below).

## Design skill

What to say if Claude seems lost: "use the design skill", or just
"design". Claude then works out what you want from your own words, splits it
into parts and does each one. You never need to know any other name.

## Example

A notification made in advance so there is something to look at: a draft,
one stopped at a particular page, a submitted one, an amended one, a late
one. Examples are made by going through the real pages with example answers,
so they look exactly like notifications a trader made. The **Reset** link on
the chooser clears a set's data and puts its examples back.

## Example link

A web address that always opens a particular example, for example
`http://localhost:3103/examples/<set-id>/<example>`. It keeps working after
the prototype restarts and after Reset, so it is safe to put in a research
script or a pull request.

## Gallery

The web page `designer:show` makes: screenshots of the pages you changed,
before and after, with error states, phone width and accessibility findings.
It is saved under `.cache/designer/show/<set-id>/` and never committed.

## Hand-off

Preparing a change for the real plants service team. Ask Claude to "hand
this to the real team", or to "write this up as a story for the developers".
It writes a folder under `handoffs/` with a brief in plain English (and a
copy ready to paste into Jira), screenshots, a table of changed words and a
patch the team can apply. It also raises the story itself: it checks the
brief for anything still unanswered, shows you the ticket it would create as
a dry run, and only creates it once you say yes in your own words. Without
Jira access set up, it stops there and gives you the brief to paste into a
story yourself. Nothing is sent anywhere without you saying so.

## Needs-person

A label the weekly update puts on its pull request when it cannot finish
alone: two changes clashed, or a check failed after the merge. A person must
sort it out before it can merge. See [Where your changes go](where-changes-go.md).

## Prototype-owned service

Something the real service cannot do yet, such as saved transporters or
dashboard filters, built in this prototype so your pages can use it. It
lives beside the real services in `src/server/app/services/<name>/`, in the
same shape, with made-up data. It is yours, and the hand-off tells the
developers what real backend it needs. See
[Where your changes go](where-changes-go.md).

## Playwright trace

A step-by-step recording of a walkthrough: every action, every network call
and a snapshot of the page at each point, opened in a viewer so you can see
exactly what happened. Every walkthrough story keeps one, alongside its
video and pictures.

## Real journey changed since

A column in the list of releases ("which releases are there"): how many of
the real journey's pages the real team has changed since your release was
made. Above 0 means your release is behind. Say "I want the latest" to
catch up.

## Real service

The live plants import notification service, built by the plants-frontend
team. This prototype is a copy of it. A file that "belongs to the real
service" is one the real team changes, and the weekly update brings their
changes in.

## Report

The single web page every walkthrough and browser test makes together: a
picture of each page, a video and a trace, filterable to one release
(`#?q=@<release-id>`) or to just the walkthroughs (`#?q=@walkthrough`).
Published to
`https://defra.github.io/trade-imports-plants-prototype/reports/` on every
pull request and every merge to `main`, and linked from the pull request's
comment.

## Research mode

Rules relaxed in a research release so participants can get past pages
without error messages. It is switched on in one saved change, listed in the
release's `research-mode.md`, and switched off after the research by undoing
that change. It never goes into a hand-off.

## Set

One journey the prototype can show, living in
`src/server/app/sets/<set-id>/` and served at `http://localhost:3103/<set-id>`.
The chooser at `http://localhost:3103/` lists every set. There are three
kinds:

- `high-risk-plants`: the real journey. It belongs to the real service and
  updates every week.
- `sample-journey`: a one-page placeholder that proves the prototype can
  hold more than one set.
- design releases: yours.

## Show

Taking screenshots of your change so you can see it and share it. Run it with
`npm run designer:show -- --set <set-id>`. It starts its own copy of the
prototype, so it never disturbs the one you have running. It makes a gallery.

## Story

One example, walked through page by page in a walkthrough. Its name is the
example's `label`, or a one-sentence `story` you write in its scenario file
to say why it exists. See [Example data](example-data.md).

## Upstream

Another name for the real service's code (the `trade-imports-plants-frontend`
repository). This prototype's `upstream` is where the weekly update fetches
changes from. "Belongs upstream" means the same as "belongs to the real
service".

## Walkthrough

A run through every example a set already has, page by page, made
automatically — nobody writes it and nobody keeps it up to date. It is
documentation, not a test: a red story never blocks a pull request. Run one
yourself with `npm run designer:walkthrough -- --set <set-id>`. See
PROTOTYPE.md, "Walkthroughs".

## Weekly update

The robot that keeps this prototype in step with the real service. Every
Monday it merges the real team's latest changes into a new branch, applies
the rules in `overrides.json`, runs the checks and opens a pull request. A
person reviews and merges it. See [Where your changes go](where-changes-go.md).

## Welsh needed

The marker for Welsh text nobody has written yet. Every page's words live in
two files, `copy.en.js` (English) and `copy.cy.js` (Welsh), which must have
the same keys. When you change English without the Welsh, the Welsh file gets
`'[Welsh needed] <the English text>'`. The check counts these markers, and
the hand-off lists them so a translator can fill them in.

## Yours, shared on purpose, removed

The other answers `npm run designer:where` gives about a file:

- **yours**: the prototype's own file. Change it freely.
- **shared on purpose**: a real-service file the prototype changed on
  purpose, listed under `patched` in `overrides.json` with the reason. Change
  it with care.
- **removed**: a real-service file the prototype does not use. The weekly
  update deletes it. Never edit it.
