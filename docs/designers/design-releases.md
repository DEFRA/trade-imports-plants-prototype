# Design releases

A design release is your own copy of the plants journey. You change it as
much as you like. The real plants team never sees it, and the weekly update
from the real service never touches it.

This guide covers starting a release, freezing one, copying a change from one
release to another, and retiring a release you no longer need. You can ask
Claude Code to do any of these in your own words, for example "start a new
design release" or "freeze this release". The `design-release` skill does
the work.

## What a release is

A release is a folder, `src/server/app/sets/<release-id>/`, and one file
beside it, `src/server/app/routes-<release-id>.js`. When the prototype is
running, it is at `http://localhost:3103/<release-id>`.

Release ids are lower-case words joined by hyphens. Start them with
`plants-`, for example:

- `plants-dr2` for design release 2
- `plants-working` for a working copy
- `plants-research-oct` for October's research round

A release is made by copying the real journey, `high-risk-plants`, or
another release. The copy:

- keeps every page, question, word and rule of the journey it came from
- keeps the example walk-through file
  (`journeys/linear/flow/fixtures/happy-path.json`), so it gets example
  notifications
- leaves out the real journey's tests, browser tests, docs and requirement
  files: they belong to the real team, and copied they would fail
- gets a `docs/README.md` that points you at the real journey's recipe docs
  in `src/server/app/sets/high-risk-plants/docs/`. Use your release id
  wherever they say `high-risk-plants`
- gets a `release.json` saying what it was copied from, when, and what it is
  for

### A release is a snapshot

A release is a copy of the real journey on the day you made it. It does not
pick up anything the real team builds afterwards. That is what keeps it
safe: nobody else's change can break your design.

To pick up the real team's later work, start a fresh release and copy your
changes into it (see [Picking up the real team's changes](#picking-up-the-real-teams-changes)).

## The four kinds of set on the chooser

The chooser at `http://localhost:3103/` lists every set with a tag:

| Tag                              | What it is                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Real journey, updates weekly** | `high-risk-plants`, the real service's journey. It belongs to the real team.                                         |
| **Working release**              | Where you make changes day to day.                                                                                   |
| **Research**                     | A release set up for a round of user research. **Research mode on** shows when some error messages are switched off. |
| **Frozen**                       | Kept exactly as it is, for developers or for the record. Nobody changes it.                                          |
| **Placeholder**                  | `sample-journey`, a one-page set the prototype keeps to prove it can show more than one journey.                     |

Each release also shows its description, "Made from … on …", and links to
its example notifications. The real journey comes first, then working,
research and frozen releases, newest first.

## Starting a release

Say "start a new design release" (or "make a working copy of the journey",
"make a research version"). Claude Code will ask what it is for and what to
call it, then:

1. makes it with
   `npm run new:set -- <release-id> --from high-risk-plants --title "<its name>" --describe "<one line>" --purpose working`
   (`research` in place of `working` for a research release). The title is
   its name on the chooser, in your words ("Design release 2"); without one
   the chooser names it from its id ("Plants dr2").
2. tidies the files with `npm run designer:format`
3. checks it with `npm run designer:check -- --set <release-id> --full`
4. takes screenshots of every page and the chooser with
   `npm run designer:show -- --set <release-id> --pages all,chooser`
5. saves it as one commit: "Start design release <release-id> from
   high-risk-plants". The commit adds about 150 files, the copy of the
   journey. Saving it on its own keeps every later change small.

To copy another release instead of the real journey, name it: "make a copy
of plants-dr2 for research".

You do not have to start one first. If you ask for a change ("change the
wording on my working release") and you have no working release yet, Claude
Code starts `plants-working` from the real journey, saves it, tells you, and
carries on with your change.

The first time you open a new release while signed in, it makes its example
notifications. The chooser links to each one.

## Freezing a release

Freeze a release when it must stay exactly as it is: a design release the
developers will build from, or a version you tested with users.

Say "freeze this release" or "freeze what we've got as design release 2".
Claude Code runs:

```
npm run designer:release -- freeze plants-dr2 --as plants-dr2-1
```

This marks `plants-dr2` as frozen and makes `plants-dr2-1`, a working
release copied from it, for you to carry on in. Without `--as`, the new
release is called `plants-dr2-working`. Add `--describe "<one line>"` to give
the working copy its line on the chooser, and `--frozen-describe "<one line>"`
to change the frozen release's own line (your last chance to change it).
`--title` and `--frozen-title` name them the same way.

Want a change in the frozen release too ("freeze DR2 with last week's change
in it", or "freeze DR2, then carry last week's change into it as well")? Say
so in the same breath: however you order it, the change is copied in first,
then the release is frozen. Nothing can be added once it is frozen.

Nobody changes a frozen release after that. Claude Code refuses to edit one
and offers you the working copy instead, and the checks and the pre-commit
hook fail on any change to a frozen release after the commit that froze it.

## Copying a change to another release

Say "copy this change to plants-dr2" when the same change belongs in more
than one release, instead of making it by hand twice. Claude Code runs:

```
npm run designer:release -- carry --from plants-working --to plants-dr2 --commit <commit id>
```

or `--working` in place of `--commit <commit id>` for a change you have not
saved yet. To find the commit, Claude Code runs
`npm run designer:release -- changes plants-working`, which lists the
release's saved changes on every branch with their dates, and says which one
it picked when two share a message. It changes the release name inside the change to match the
target, then applies it. A saved change can come from a release on another
branch ("last week's release"): the carry reads that release from the commit,
so the other branch does not need merging first.

If the target has changed in the same place, you get both versions marked in
the file, and Claude Code asks you which to keep.

It will not copy a change into:

- a frozen release: copy it into that release's working copy instead
- `high-risk-plants`: to send a change to the real service, say "hand this
  to the real team"

## Picking up the real team's changes

1. Start a fresh release from `high-risk-plants`, for example `plants-dr3`.
2. Ask Claude Code to "copy my changes from plants-dr2 to plants-dr3". It
   copies each of your saved changes across in order.
3. Where the real team changed the same lines as you, it shows you both
   versions and you choose.
4. Freeze or retire the old release.

## Retiring a release

Retire a release when nobody needs it any more. Say "retire release
plants-research-oct". Claude Code runs:

```
npm run designer:release -- retire plants-research-oct
```

It removes the release's folder, its line on the chooser, its two lines in
`overrides.json`, and its example data, then saves the removal as one
commit. The release stays in git history, so it can be brought back.

It will not retire:

- `high-risk-plants` or `sample-journey`
- a release with changes you have not saved: save or undo them first
- a release that was never saved at all, unless you say to throw it away.
  It is not in git history, so once removed it is gone for good.

## Two branches that each started a release

Every new release adds a line at the same place in three shared files
(`overrides.json` and two files in `src/server/prototype-sets/`). So when two
branches that each started a release are merged, git always stops on those
three files. You do not settle that by hand. Say "fix the release clash", and
Claude Code runs:

```
npm run designer:release -- remount
```

It rebuilds the three files from the release folders on disk, so every
release is mounted, on the chooser and marked as yours.

## Where pages sit

To see the order a page is asked in, where Continue goes, and which task list
group it is in:

```
npm run designer:release -- orders plants-working consignors/select
```

## Keep a handful

Every live release is loaded each time the prototype starts. Keep to about
five working and research releases. Retire the ones you have finished with,
and freeze the ones you need to keep.

## Seeing all your releases

Say "which releases are there". Claude Code runs:

```
npm run designer:release -- list
```

It lists every set with its kind, what it was made from, when, whether it is
frozen, whether research mode is on, and how many design gaps it has logged.

## Links to examples

Each example notification has a link that keeps working after the prototype
restarts and after Reset:

```
http://localhost:3103/examples/<release-id>/<example>
```

The chooser shows these links under each release. They open the page the
example stopped at. Add `?page=<page>` to open another page of the same
notification, for example `?page=task-list` or `?page=notification-view`
(check your answers). See [Example data](example-data.md) to add examples.

## Checks that keep releases working

- Every check (`npm run designer:check`) and every pull request runs the unit
  tests with all your releases loaded, so a release that stops the prototype
  starting is caught before it is merged.
- Every pull request also makes a throwaway release from the real journey and
  checks it works. If this "design release canary" fails after a weekly
  update, making new releases is broken: tell the maintainer.

## How a change in a release reaches the real service

Releases never go to the real service as a whole. A single change you want
the real team to build goes through a hand-off: say "hand this to the real
team". See [Sharing and handing off](sharing-and-handing-off.md).

## Related guides

- [Where your changes go](where-changes-go.md)
- [Example data](example-data.md)
- [Research sessions](research-sessions.md)
- [Checks and errors](checks-and-errors.md)
- [Glossary](glossary.md)
