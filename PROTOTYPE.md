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

Open Claude Code in this folder and say what you want in your own words. You
do not need to learn the code, the commands or the names of anything. Claude
works out what you mean, makes the change in your design release, checks it,
shows you pictures of it and tells you what to click.

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

**Using Cursor or another assistant.** It reads `AGENTS.md`, which holds the
same instructions, so the same words work. Two differences: there is no
automatic guard on the real service's files (ask "whose file is this?" if
unsure), and lists of changes run one at a time, which takes longer but ends
in the same place.

If Claude Code reports a missing hook script when it starts, the prototype's
own Claude Code settings are not in place yet. It is harmless: carry on. The
prototype maintainer has the fix (see "For maintainers" in
[README.md](README.md)).

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
- **The "Address book" link in the header goes nowhere.** The real service
  sends it to a separate service this prototype does not run.
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

- **It is not deployed yet.** Until it is, run demos and research sessions
  from a laptop with `npm run dev`. The research sheet prints a local link
  for each task.
- **No custom styles or scripts yet**, as above: they are design gaps.

## Deploying and merging

When the prototype is deployed, the maintainer puts its address here and in
`deployedUrl` in `scripts/designer/prototype.json`. It signs you in through
the Defra ID stub, the same test sign-in the real service uses: pick any
test user, and sign out and in again to change user.

The deployed prototype only changes when a pull request is merged into
`main`. Your pull request is reviewed and merged by the prototype maintainer
(ask in your team if you do not know who that is). Say "make a pull
request", send the link to the maintainer, and leave at least a working day
before a demo or a research session. "Is my pull request merged yet?"
explains any red check. With merge rights and an approval, "merge my pull
request" merges only when every check is green.

## If you're not sure

- Ask "whose file is this?" or "can I change this?".
- [Where your changes go](docs/designers/where-changes-go.md) explains the
  weekly update, who owns what, and how a change reaches the real service.
- The [glossary](docs/designers/glossary.md) explains every term used here.
