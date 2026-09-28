# A guide for designers

This is a working prototype of the high-risk plants import notification
service. It looks and behaves like the real thing, but nothing you do here
is real: there is no real backend and no real data. It is safe to click
anything.

It is not a Prototype Kit prototype. It is a copy of the real service's own
code, with the same GOV.UK components, the same pages and the same rules for
which page comes next. What you design here is much closer to what the real
team will build, and handing a change over to them is much easier.

New here? Start with [Your first hour](docs/designers/your-first-hour.md).
Every designer document is listed in
[docs/designers/README.md](docs/designers/README.md).

## Working with Claude Code

You do not need to learn the code or the commands. Open Claude Code in this
folder and say what you want in your own words. Claude picks the right skill,
makes the change in your design release, checks it, shows you pictures of it,
and tells you what to click.

| You want to                                 | Say something like                                                      | Skill                |
| ------------------------------------------- | ----------------------------------------------------------------------- | -------------------- |
| Start the prototype                         | "run the prototype", "it won't start", "where did my data go"           | `run-the-prototype`  |
| Start, freeze or copy a design release      | "start a new design release", "freeze this as design release 2"         | `design-release`     |
| Change words, hints, labels or errors       | "rename 'Consignment parties' to 'Consignment addresses' everywhere"    | `change-the-words`   |
| Make a page look like your Figma            | "make this page match the Figma", "change the spacing", "add a tag"     | `match-the-design`   |
| Bring over a page from the old prototype    | "re-create the transporter page from the old prototype"                 | `port-a-kit-page`    |
| Add a question or page, or change the order | "add a question", "move this page", "only show this page when"          | `change-the-journey` |
| Add example notifications or addresses      | "add a late example", "a link straight to the commodities page"         | `example-data`       |
| Fake something the real service cannot do   | "add a transporter lookup", "add tabs with counts to the dashboard"     | `fake-a-service`     |
| Get ready for user research                 | "get ready for research", "let participants through", "print a sheet"   | `research-session`   |
| Check your change                           | "check my changes", "did I break anything", "what does this error mean" | `check-my-change`    |
| See your change                             | "show me", "before and after", "compare with the Figma"                 | `show-my-change`     |
| Save, share or undo                         | "save my work", "make a pull request", "undo my last change"            | `share-my-change`    |
| Make your change real                       | "hand this to the real team", "make this real"                          | `hand-off`           |

Got a list of changes, such as notes from a crit? Say "here are my notes,
do all of these". Claude works through them one at a time, parks anything it
cannot do with a plain reason, shows the whole session in one gallery and
saves each change separately.

Every change ends the same way: Claude checks it, shows it, and offers to
hand it to the real team.

### Using Cursor or another assistant

Cursor, and other coding assistants, work too: they read `AGENTS.md`, which
points them at the same skills, so the same phrases work. Two things are
different:

- **There is no automatic guard.** Claude Code can stop edits to the real
  service's files on its own (once the prototype's settings are in place).
  Elsewhere, ask "whose file is this?" before a change if you are unsure; the
  assistant runs `npm run designer:where` and tells you.
- **Lists run one at a time.** "Do all of these" and big wording sweeps run
  as workflows in Claude Code. Other assistants follow the same steps one
  change after another, which takes longer but ends in the same place.

If Claude Code reports a missing hook script when it starts, the prototype's
own Claude Code settings are not in place yet. It is harmless: carry on. The
prototype maintainer has the fix (see "For maintainers" in
[README.md](README.md)).

## Running it on your computer

You need Node.js installed. Nothing else: no database, no other services
running, no environment variables to set.

```
npx --yes npm@11.6.2 ci
npm run playwright:install
npm run dev
```

Then open [http://localhost:3103](http://localhost:3103). You sign in with
the real service's own development sign-in, which signs you straight in
without asking for a name or password.

(`npx --yes npm@11.6.2` runs the exact npm version this project expects.
Your own npm may be newer, and a newer npm can refuse to install against this
project's lockfile.)

You only need `npm run playwright:install` once. It installs the browser that
takes the pictures of your pages.

If `npm run dev` says the port (3103) is already in use, the prototype is
probably already running in another window: open
[http://localhost:3103](http://localhost:3103) and see. Say "port in use" to
Claude and it will tell you which program holds the port. It never stops a
program without asking you.

`npm start` runs the prototype the way it runs when deployed. Like the real
service, it then needs a Defra ID sign-in service to sign you in, so use
`npm run dev` on your own computer.

## The deployed prototype

**It is not deployed yet.** Until it is, run demos and research sessions from
a laptop with `npm run dev` (the research-session skill prints a sheet with a
local link for each task). When it is deployed, the prototype maintainer puts
its address here and in `deployedUrl` in `scripts/designer/prototype.json`,
where the research sheet picks it up.

Once deployed, it signs you in through the Defra ID stub, the same test
sign-in service the real service uses when deployed. Pick any of its test
users. To see the prototype as a different user, sign out and sign in as a
different test user.

The deployed prototype only changes when a pull request is merged into
`main`. Work on a branch cannot be seen there until it is merged, so share
and merge before a demo or a research session.

## Getting it merged

Your pull request is reviewed and merged by the prototype maintainer, the
person who looks after this prototype and its weekly update. If you do not
know who that is, ask in your team.

- **Ask for a review when you open it.** Say "make a pull request" and Claude
  opens it; send the link to the maintainer and say when you need it merged.
  Leave at least a working day before a demo or a research session.
- **Red checks.** Say "is my pull request merged yet?" or "check my pull
  request". Claude reads the checks and explains any failure in plain words,
  then fixes it with "check my changes" and sends the fix.
- **Merging it yourself.** If you have merge rights and the maintainer has
  approved it, say "merge my pull request". Claude merges only when every
  check is green.

## Example data

A set with example data creates a handful of example notifications the first
time someone opens it after it starts, in a mix of states: draft, in
progress, submitted, and submitted then amended. The real journey
(high-risk-plants) also has late, deleted, copied, amendment-cancelled and
another organisation's examples. They are made by going through the journey
itself, so they look exactly like notifications a trader made. Everyone who
signs in sees the same examples, whichever user they sign in as.

The data is shared. Anyone using the prototype can change or delete what
anyone else has made, and reset it for everyone.

## Your data and example links

- **Saving a file restarts the prototype.** When you (or Claude) save a
  change, the prototype restarts so you see the change.
- **Your design releases keep their data on your computer.** Notifications
  you make in a design release are kept when the prototype restarts
  (running with `npm run dev` only). The real journey's data does not survive
  a restart, and neither does any data on the deployed prototype.
- **Reset brings the examples back.** On the chooser, "Reset this
  prototype’s data" clears everything in that set and puts the examples back.
- **Example links do not break.** Every example has a stable link, for
  example `http://localhost:3103/examples/high-risk-plants/<example>`. It
  opens the page the example stopped at, even after a restart or a Reset.
  The chooser lists each set's example links. Say "a link straight to the X
  page" to add one.
- **Signing in as another organisation.** Locally, go to
  `http://localhost:3103/auth/stub-sign-in?organisationId=<organisation>` to
  see another organisation's examples.

## What a "set" is

This prototype can hold more than one prototype at once. Each one is called
a set:

- **high-risk-plants**: the real high-risk plants and plant products
  notification journey. It follows the real service and changes every week.
- **sample-journey**: a bare-bones placeholder, kept only to prove the
  prototype can host more than one set. It is not a real journey.
- **your design releases**: copies you make and own. See below.

Each set lives at its own web address, for example
`http://localhost:3103/high-risk-plants`. A page never appears at more than
one address, and the root address (`/`) is never a set itself: it is
always the chooser.

## Your design releases

A design release is your own copy of the real journey, for example
`plants-working`. Everything inside it is yours: the weekly update never
touches it, so you can change words, layouts, pages and flow freely.

- **It is a snapshot.** It is a copy of the real journey on the day you made
  it. It does not pick up the real team's later changes. To pick them up,
  start a fresh release and carry your changes across.
- **Working, frozen and research releases.** A working release is where you
  design. A frozen release is a fixed version, such as "design release 2",
  kept stable for developers and reviews: nobody edits it. A research release
  is set up for a user research round.
- **Freeze and carry on.** "Freeze this as design release 2" freezes your
  release and gives you a new working copy of it. "Copy this change to
  release X" carries a change from one release to another.
- **Retire** a release you no longer need. Keep the number of live releases
  to a handful.
- **Welsh.** A release's Welsh is checked for placeholders, not translated.
  New words get `[Welsh needed]` in the Welsh file until a translator
  provides the Welsh. The prototype only ever shows English: say "show me
  the Welsh" to see both side by side.

See [Design releases](docs/designers/design-releases.md) for more.

## The chooser

`http://localhost:3103/` lists every set. Each one has a tag saying what kind
it is (the real journey, a working, frozen or research release, or the
placeholder), when and from what it was made, and its example links. From
there you can:

- **Open a set**: click its name.
- **Open an example**: click one of its example links.
- **Reset a set's data**: once signed in, click "Reset this prototype’s
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
- **No custom styles or scripts yet.** Only GOV.UK Frontend components and
  classes are available. What they cannot do is logged as a design gap in
  your release's `design-gaps.md` and travels with the hand-off.

## Adding a set

Say "start a new design release" to Claude. Behind the scenes it runs:

```
npm run new:set -- <release-id> --from high-risk-plants --describe "<what it is for>" --purpose working
```

for example `npm run new:set -- plants-working --from high-risk-plants`.
This copies the real journey (without its tests), renames everything inside
it to your release's id, records where it came from, and mounts it: it
appears on the chooser automatically, with no further wiring. `--purpose` is
`working` (the default), `frozen` or `research`.

Without `--from`, it copies the `sample-journey` placeholder instead, for a
set that starts from nothing.

A set id must be lower-case words separated by hyphens, like
`plants-working`, never spaces, capitals or underscores. Start a release's id
with `plants-`.

## Where to edit pages

Everything a set shows lives under `src/server/app/sets/<set-id>/`:

- **Templates**: the `.njk` files, one per page. These are the HTML and the
  GOV.UK Design System components a page is built from.
- **Copy**: each feature's `copy/copy.en.js` (and `copy.cy.js` for Welsh)
  file. Wording changes almost always belong here, not in the template.

Changing a page's logic (which pages come next, what counts as a valid
answer) is more involved, and belongs in the same feature's `controller.js`
or in the set's `flow/flow.js`. The `change-the-journey` skill follows the
repo's own recipes for it: see
[Journey recipes](docs/designers/recipes/README.md).

Only edit inside your own design release. Claude checks whose file it is
before every change.

## Checking, showing and sharing a change

- **Check it.** "Check my changes" runs the right check and explains any
  problem in plain English, including whether your change caused it. A full
  check is exactly what runs when you save, so a save after a green full
  check works first time. See
  [Checks and errors](docs/designers/checks-and-errors.md).
- **Show it.** "Show me" takes pictures of your changed pages into a gallery
  you can open, attach or send: before and after, error messages, phone
  width, your Figma frame beside the page, the real journey beside yours, and
  a walkthrough video. See
  [Seeing your change](docs/designers/seeing-your-change.md).
- **Share it.** "Save my work" puts your change on its own branch and saves
  it with a message that says what changed on which pages. "Make a pull
  request" sends it to GitHub, only when you say so. "Undo my last change"
  adds an undo instead of deleting history. See
  [Saving, sharing, undoing and handing off](docs/designers/sharing-and-handing-off.md).

## Making a change real

When a change should become part of the real service, say "hand this to the
real team". Claude writes a hand-off folder under `handoffs/`: a brief in
plain English (and a copy ready to paste into Jira), before and after
pictures, a table of changed words, and a patch the plants-frontend team can
apply. The brief also lists what cannot ship as it is: Welsh still needed,
fake services, design gaps and research-only rules.

Nothing is ever pushed to the real service from here. The real team, or a
developer, applies the patch there and raises the pull request. Once it is
merged into the real service, the next weekly update brings it into the real
journey here: you don't need to redo it.

## How the weekly sync works

The real service this prototype mirrors (`trade-imports-plants-frontend`)
keeps changing. Every Monday (and any time by hand), a robot:

1. Fetches the real service's latest changes.
2. Merges them into this prototype.
3. Checks everything still works: the code builds, the tests pass, and
   every set on the chooser still opens.
4. Opens a pull request with the result.

No sync pull request merges itself: a person reviews and merges every one.
When the robot could not finish cleanly (the merge hit a conflict, or a
check failed), the pull request is left as a draft and labelled
**`needs-person`**. That label means a person needs to sort it out before it
can merge. If you see one, or a set you're using has started behaving oddly
after a Monday, that's the place to look.

Files listed as the prototype's own (`ours` in `overrides.json`) are never
touched by the sync: your design releases are among them. A change to any
other file is not lost straight away. It stays until the real service changes
the same lines. Then the merge clashes and the sync pull request lands on a
person as `needs-person`. That is why changes belong in your design release.

## How a change reaches the real service

This prototype never sends anything back the other way. If a change you
make here should also happen in the real service, it needs making there
separately: see [Making a change real](#making-a-change-real). Once that pull
request merges into the real service, the next weekly sync brings it into
this prototype automatically.

## What never to edit

Some files in this prototype are not really this prototype's own: they
belong to the real service, and the weekly sync will clash with anything you
change in them. `overrides.json` at the repo root keeps the definitive list:

- **`ours`**: files that are the prototype's own, such as your design
  releases, the designer docs and Claude's skills. Safe to change.
- **`patched`**: files the prototype has made one small, deliberate change
  to (for example, so it serves example data rather than calling the real
  service's backend). A change here needs the same care as a change to the
  real service itself.
- **everything else** belongs to the real service. Only ever edit it if you
  mean to send that change back to `trade-imports-plants-frontend`, never to
  fix something only for this prototype.

## If you're not sure

- Ask Claude "whose file is this?" or "can I change this?". It runs
  `npm run designer:where` and tells you in one sentence.
- [Where your changes go](docs/designers/where-changes-go.md) explains the
  weekly update and who owns what.
- The [glossary](docs/designers/glossary.md) explains every term used here.
- Every designer document is listed in
  [docs/designers/README.md](docs/designers/README.md).
