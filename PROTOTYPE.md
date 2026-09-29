# A guide for designers

This is a working prototype of the high-risk plants import notification
service. It is a copy of the real service's own code: the same GOV.UK
components, the same pages and the same rules for which page comes next.
Work on one page and the next page is already there, because it is the real
one. Nothing you do here is real, so it is safe to click anything.

New here? Start with [Your first hour](docs/designers/your-first-hour.md).
Every designer document is listed in
[docs/designers/README.md](docs/designers/README.md).

## Just say what you want

Open Claude Code at the workspace root (see "Getting started" below) and
say what you want in your own words. You do not need to learn the code, the
commands or the names of anything. Claude works out what you mean, makes the
change in your design release, checks it, shows you pictures of it and
tells you what to click. `npm run dev` needs no docker stack, no backend and
no Jira access.

| You want to                                   | Say something like                                                           |
| --------------------------------------------- | ---------------------------------------------------------------------------- |
| Get started                                   | "I'm new, what can I do here?", "run the prototype"                          |
| Have your own copy to change                  | "start a new design release", "freeze this as design release 2"              |
| Change words, hints, labels or errors         | "rename 'Consignment parties' to 'Consignment addresses' everywhere"         |
| Make a page look like your Figma              | "make this page match the Figma", "add a tag"                                |
| Add a question or page, or change the order   | "add a question", "move this page", "only show this page when"               |
| Show a feature the real service does not have | "importers should be able to save a vehicle they use a lot"                  |
| Fill the dashboard                            | "show a few overdue notifications on the dashboard"                          |
| Bring over a page from the old prototype      | "re-create the transporter page from the old prototype"                      |
| Get ready for a demo or for research          | "we've got a stakeholder demo on Thursday", "get ready for research"         |
| Work through notes from a crit                | "here are my notes from the crit, do all of these"                           |
| Check, see, save or undo                      | "check my changes", "show me, before and after", "save my work", "undo that" |
| Give the developers something to build from   | "write this up as a story the developers can pick up"                        |
| Catch up with the real service                | "has the real service changed since I made my copy?"                         |

Every change ends the same way: Claude checks it, shows it, and offers to
hand it to the real team.

**If Claude seems lost, say "use the design skill".** It then works out what
you want from your words and splits it into parts.

## Getting started

1. Clone the workspace:
   `git clone https://github.com/DEFRA/trade-imports-workspace.git`.
2. Run its setup once you have Node.js and Claude Code:
   `npm --prefix ~/git/defra/trade-imports-workspace/tim link`, then
   `tim prototype setup`. It installs this repo's packages, checks your
   GitHub and Jira sign-in, and tells you what is left before you can
   share your work.
3. Open Claude Code at the workspace root
   (`~/git/defra/trade-imports-workspace`), not in this repo's own folder.
   Say what you want, exactly as above: the workspace root is where the
   `prototype` skill lives, and it is what makes Claude read the real
   service while it builds for you, so your prototype stays close to it.

See [Your first hour](docs/designers/your-first-hour.md) for the full
walk-through, from nothing to a shared change.

## How close is this to the real service?

Very close, with these differences. All of them are known.

- **Your design release is a snapshot.** It copies the real journey on the
  day you make it and does not pick up the real team's later changes. The
  release list ("which releases are there") has a "Real journey changed
  since" column that says how far each release is behind. Say "I want the
  latest" to catch up. See [Design releases](docs/designers/design-releases.md).
- **Prototype-owned services.** Things the real service cannot do yet, such
  as saved transporters, templates and dashboard filters, are built here with
  made-up data, flagged "needs a real service". See
  [Where your changes go](docs/designers/where-changes-go.md).
- **Design gaps.** Only GOV.UK Frontend components and classes are
  available. What they cannot do is logged in your release's
  `design-gaps.md` and travels with the hand-off.
- **The "Address book" link in the header is deliberately dead.** The
  address book belongs to the Import Notification Service, which this
  prototype does not include. You never need it to see a change here.
- **Commodity and Arrival are blank on the real journey's dashboard.** This
  is a bug in the real service, not in your release: your release shows them.
- **Welsh is never shown.** The prototype only shows English. New words get
  `[Welsh needed]` until a translator provides the Welsh. Say "show me the
  Welsh" to see both side by side.
- **The data is shared.** Everyone who signs in sees the same examples, and
  anyone can change, delete or reset what anyone else has made. Saving a file
  restarts the prototype, and "Reset this prototype’s data" on the chooser
  puts the examples back.

## Known gaps

- **It is not deployed yet.** Every pull request proves its `Dockerfile`
  boots, but the CDP environment is not stood up. Until it is, run demos
  and research from a laptop with `npm run dev`.
- **No custom styles or scripts yet**, as above: they are design gaps.

## Walkthroughs: the demo page and the technical report

Every set gets a **walkthrough**: each example, page by page, at a person's
pace, with pictures, a video and a trace. It is documentation, not a test: a
red story never stops a pull request. Say "record a walkthrough" to make one.

The walkthroughs feed a **demo page**: short videos of the most important
journeys first, for anyone interested in the prototype rather than the code.
Each pull request gets a comment linking to its copy at `reports/pr-<n>/`;
`main`'s lives at `https://defra.github.io/trade-imports-plants-prototype/`
(once GitHub Pages is on), with the full Playwright report at `tests/`. Choose what leads it with
`featured` and `headline` on an example — see
[Example data](docs/designers/example-data.md#choose-what-the-demo-page-shows-first)
and
[Seeing your change](docs/designers/seeing-your-change.md#the-demo-page-and-the-technical-report).

## Deploying, sharing and merging

Once deployed, the maintainer puts its address here and in `deployedUrl` in
`scripts/designer/prototype.json`. Like `npm run dev`, it uses stub sign-in:
signed in automatically, on purpose, until CDP puts its own auth in front.

`main` is not protected: "save my work" then "share this" pushes straight
there. Say "make a pull request" to share work in progress on a branch
first — see [Sharing and handing off](docs/designers/sharing-and-handing-off.md).

## If you're not sure

- Ask "whose file is this?" or "can I change this?".
- [Where your changes go](docs/designers/where-changes-go.md) explains the
  weekly update, who owns what, and how a change reaches the real service.
- The [glossary](docs/designers/glossary.md) explains every term used here.
