# Where your changes go

This prototype is a copy of the real plants service. Some files are yours to
change freely. Others belong to the real service, and a change to them will
clash with the real team's work. This page explains how to tell which is
which, and what to do about it.

## Ask before you change a file

Run:

```
npm run designer:where -- <file> [<file> ...]
```

For example:

```
npm run designer:where -- src/server/app/sets/high-risk-plants/journeys/linear/features/origin/copy/copy.en.js
```

To ask about everything you have changed since your last save, run:

```
npm run designer:where -- --changed
```

It prints one line per file. It never changes anything, so it is always safe
to run. If you are working with Claude Code, it runs this for you before every
change.

## The four answers

| Answer                                                                                                                                   | What it means                                                                                                                                 | What to do                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Yours: safe to change. The weekly update never touches it.                                                                               | The file is listed under `ours` in `overrides.json`. Your design releases, the designer guides and the prototype's own scripts are all yours. | Change it.                                                                                                          |
| Shared with the real service and changed on purpose here: change with care, and say why in overrides.json.                               | The prototype changed this real-service file on purpose, and `overrides.json` lists it under `patched` with the reason.                       | Keep your change small. Update the reason (`why`) in `overrides.json`. Expect to help if the weekly update clashes. |
| Belongs to the real service: the weekly update will clash with your change. Make it in your design release, or hand it to the real team. | The file is a copy of the real service's file. The real team changes it, and every Monday their changes come in.                              | Make the change in your design release instead, or prepare it for the real team (see below).                        |
| Removed by the weekly update: never edit.                                                                                                | The file is listed under `deleted` in `overrides.json`. The weekly update deletes it every time the real service changes it.                  | Leave it alone.                                                                                                     |

There is one more answer: **"This is a frozen release. Start a working
release from it instead."** A frozen release is a snapshot kept for
developers or for the record. Nobody changes it. Start a working release from
it and make your change there.

## Your two safe routes for a real-service file

1. **Do it in your design release.** This is the usual route. Your design
   release is a full copy of the journey that you own. Change the matching
   file in `src/server/app/sets/<your release>/` instead. If you do not have a
   release yet, ask Claude to "start a new design release".
2. **Prepare it for the real team.** If the change should become part of the
   real service, ask Claude to "hand this to the real team". It prepares a
   brief and a patch for the plants-frontend team, and can make the change
   for real in a checkout of `trade-imports-plants-frontend`. Once the real
   team merges it, the weekly update brings it back here.

## Who owns what

This is a picture of the main folders and who owns them today.
`overrides.json` is the definitive list, and `designer:where` always reads
it, so trust `designer:where` over this picture.

```
.
├── overrides.json                          [yours]  the weekly update's rules
├── PROTOTYPE.md, CLAUDE.md, AGENTS.md      [yours]
├── README.md, Dockerfile, NOTICE           [shared on purpose]
├── package.json, package-lock.json         [shared on purpose]
├── .gitignore, playwright.config.js        [shared on purpose]
├── webpack.config.js, vitest.config.js     [real service]
├── .claude/
│   ├── settings.json                       [real service, for now]
│   └── rules/                              [yours]
├── docs/designers/                         [yours]  guides like this one
├── handoffs/                               [yours]  briefs for the real team
├── scripts/
│   ├── designer/, new-set/, sync-upstream/ [yours]
│   └── lighthouse/                         [removed]
├── fit/
│   ├── sets-chooser.fit.spec.js,
│   │   designer-sets.fit.spec.js           [yours]
│   └── everything else                     [real service]
└── src/
    ├── client/                             [real service]  styles and browser code
    ├── index.js                            [shared on purpose]
    ├── config/config.js                    [shared on purpose]
    └── server/
        ├── router.js                       [shared on purpose]
        ├── prototype-*/                    [yours]  chooser, examples, stub plumbing
        ├── sets-index/                     [yours]  the chooser page
        └── app/
            ├── engine/, model/, bridge/,
            │   flow/, lib/, shared/        [real service]  the platform every set runs on
            ├── services/
            │   ├── transporters/, templates/,
            │   │   ins-address-book/,
            │   │   notification-search/    [yours]  prototype-owned services
            │   └── everything else         [real service, some files shared on purpose]
            ├── routes.js                   [real service]
            ├── routes-high-risk-plants.js  [real service]
            ├── routes-<your release>.js    [yours]
            ├── sets-index/                 [yours]
            └── sets/
                ├── high-risk-plants/       [real service]  the real journey
                ├── sample-journey/         [yours]  a placeholder
                └── <your release>/         [yours]  unless it is frozen
```

## Prototype-owned services

When a design needs something the real service cannot do yet (saved
transporters, templates, dashboard filters), Claude builds it as a
prototype-owned service in `src/server/app/services/<name>/`, beside the
real services and in the same shape: an `index.js` that picks stub data in
the prototype, a `client.js` that would call a real backend, and a
`stub.js` with its starter rows. Each one has its own line in `ours` in
`overrides.json`, so it is yours while every other folder in `services/`
stays the real service's. Pages use it exactly as they would use a real
service, and the hand-off gives the developers its `index.js`, `client.js`
and a description of the backend it needs.

`npm run designer:service -- list` lists them. Only Claude makes one, with
`npm run designer:service -- new <name>`, and it refuses a name the real
service already uses. See [Services and dashboards](services-and-dashboards.md).

## The header and navigation

`shared/layout.njk` (the header, footer and navigation) belongs to the real
service and is shared by every set. A change to the header or navigation is a
design gap: write it down in your release's `design-gaps.md` so it travels
with the hand-off.

The header's "Address book" link goes to the Import Notification Service
frontend, a separate service, the same as the real service. This prototype
does not run it itself, so the link only goes somewhere when that service
is: the workspace docker stack, or `trade-imports-ins-frontend` run
natively, both work locally. On a deployed prototype,
`TRADE_IMPORTS_INS_FRONTEND_URL` sets where it points. None of this is
ever needed to see a change you make here.

## What the weekly update really does

The weekly update is a robot that keeps this prototype in step with the real
service. It runs every Monday morning, and anyone can run it by hand with
`npm run sync:upstream`.

1. It fetches the real service's latest `main` branch.
2. It merges it into a new branch called `sync/upstream-<date>`.
3. For every file the merge touched, it applies the rules in
   `overrides.json`:
   - **removed** files are deleted again
   - **yours** files are put back exactly as the prototype had them
   - **everything else** merges normally: the real team's changes and the
     prototype's changes are both kept, as long as they changed different
     lines
4. It runs the same checks as every pull request: it builds, lints, runs the
   tests and opens every set on the chooser.
5. It opens a pull request with a summary of what came in.

A person reviews and merges every weekly update pull request. Nothing merges
itself.

So a change you make to a real-service file is not lost straight away. It
survives until the real team changes the same lines. Then the merge cannot
decide whose version to keep, and your change becomes someone's problem. That
is why the safe routes above exist.

## What "needs-person" means

When the weekly update hits a clash it cannot settle, or a check fails after
the merge, it opens its pull request as a draft and labels it
`needs-person`. That means a person has to look at the pull request, sort out
the clash or the failing check, and then merge it.

If you see a `needs-person` pull request, or a set you use started behaving
oddly after a Monday, that is the place to look. If the clash is in a file you
changed, you are the best person to say which version is right.

## How a change reaches the real service

This prototype never sends anything back to the real service on its own.
If a change you make here should also happen in the real service, it needs
making there separately: say "hand this to the real team" (or "write this up
as a story for the developers"). Claude writes a hand-off folder under
`handoffs/`: a brief in plain English and a copy ready to paste into Jira,
before and after pictures, a table of changed words, and a patch the
plants-frontend team can apply. The brief also lists what cannot ship as it
is: Welsh still needed, prototype-owned services, design gaps and
research-only rules.

The real team, or a developer, applies the patch there and raises the pull
request. Once it is merged into the real service, the next weekly update
brings it into the real journey here: you don't need to redo it. See
[Saving, sharing, undoing and handing off](sharing-and-handing-off.md).

## Words used on this page

See the [glossary](glossary.md) for design release, frozen release, weekly
update, upstream, hand-off and the other words used here.
