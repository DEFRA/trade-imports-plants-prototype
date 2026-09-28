# Saving, sharing, undoing and handing off

This guide covers the end of the loop: once a change looks right, how to save
it, show it to others, take it back if you change your mind, and hand it to
the real plants-frontend team.

You do not need to know git. Say what you want to Claude in your own words.
The words in quotes below are examples of what works.

## Saving your work

Say "save my work" or "commit this".

Claude will:

1. Tell you in a few lines what changed: which pages, which words, which
   examples.
2. Check every changed file is yours (see [Where your changes go](where-changes-go.md)).
   If a file belongs to the real service, Claude stops and offers to make the
   change in your design release instead, or to hand it to the real team.
3. Put your work on your own branch if you are on `main`. Branches are named
   `design/<release>-<a-few-words>`, for example
   `design/plants-working-consignment-addresses`.
4. Tidy the formatting and run the full check
   (`npm run designer:check -- --set <release> --full`). If something fails,
   Claude explains it and fixes it before saving.
5. Save the change with a message that says what changed and where, for
   example:

   `plants-working: rename 'Consignment parties' to 'Consignment addresses' on 6 pages; Welsh needed`

The same checks run automatically every time anything is saved. Because
Claude runs them first, the save goes through first time.

A saved change is only on your computer until you share it.

## Sharing it with others

Say "make a pull request", "share this" or "publish".

Claude always asks before sending anything to GitHub. When you say yes, it
sends your branch and opens a pull request on the prototype's own repository.
The pull request says:

- what changed and why, and which design release it is in,
- which pages changed, with links,
- what the screenshots show, and what the accessibility check found,
- whose files they are,
- any Welsh still needed and any design gaps,
- how to make it real.

The pull request's checks include a browser test run. Its
`frontend-playwright-report` download has a video walking through each design
release, which is handy for show and tell.

The deployed prototype only changes after the pull request is merged to
`main`. If you need a change for a research session, get it merged the day
before.

## Undoing a change

Say "undo that", "go back" or "throw away what I just did". Your words are
the go-ahead: Claude does it straight away and tells you exactly what it
undid. It asks one question only when your words could mean two different
changes.

- **Changes you have not saved yet.** The files are put aside rather than
  deleted, so the change can come back if you ask ("bring back what you put
  aside").
- **The last change you saved.** Claude adds a new "undo" change that
  reverses it. Your history keeps both, so nothing is lost.
- **A particular change**, found by what it was called ("undo the green panel
  change"). The same kind of undo. If a later change touched the same lines,
  Claude stops and explains the choices.

Claude never deletes history, never forces anything, and never undoes the
weekly update or someone else's merged pull request. Research mode has its own
off switch: see [Research sessions](research-sessions.md).

## Making it real: handing off to the real team

Say "hand this to the real team", "send this to the developers" or "make this
real".

Nothing is ever sent to the real service automatically. The prototype cannot
push to plants-frontend: that door is locked on purpose. Instead, Claude
prepares a folder the real team can use.

### What you get

A folder in `handoffs/`, named with the date and a few words, for example
`handoffs/2026-09-27-consignment-addresses/`. It holds:

- `brief.md`: the brief, in plain English. What changed and why, each page
  with screenshots, a table of old and new words, the Welsh still needed, the
  tests the real team must update, what cannot ship yet, the recipe you
  followed, what was left out and why, and how to apply it.
- `brief.jira.txt`: the same brief, ready to paste into a Jira story.
- `upstream.patch`: your change rewritten as the real service's files. It has
  been checked against the real journey, so the brief says whether it applies
  cleanly.
- `report.json`: the same facts for tools to read.
- `screenshots/`: pictures from `designer:show`, kept under 2 MB in total.

### What "cannot ship as it is" means

Some things in a design release are there only to make the prototype work.
The brief lists each of them so nobody is surprised:

- **Pretend services.** A page that uses a service faked in the prototype,
  such as saved transporters or templates. The real team needs a real service
  first. The brief includes the pretend data as a starting point for that
  conversation.
- **Welsh needed.** Words marked `[Welsh needed]` still need a translator.
- **Design gaps.** Anything the GOV.UK toolbox could not build, from your
  release's `design-gaps.md`.
- **Research mode.** Rules you switched off for a research session. Switch
  research mode off before handing off if you can.

### The two routes

**Route 1: a brief and a patch from your design release.** This is the
usual route. Claude takes screenshots of your pages next to the real
journey's, writes the folder, reads the brief back to you, and saves the
folder on your branch. The real team then takes it from there.

**Route 2: ready for the real team's own tests.** When a developer wants the
change proven first, Claude builds the ready part of your change into a copy
of the real journey on a separate branch named `handoff/<a-few-words>`,
updates the real team's tests that expect the old words, runs those tests,
takes before-and-after screenshots, and writes the folder there. Anything
that cannot ship yet is left out and listed. Then Claude takes you back to
your own branch.

The `handoff/` branch is never merged into the prototype's `main`. Once the
real team merges your change into plants-frontend, Monday's weekly update
brings it back into the prototype.

### How it reaches the real service

Either:

- **the team takes the brief and the patch**: share the brief's link from your
  pull request, or paste `brief.jira.txt` into a Jira story and attach
  `upstream.patch` and the screenshots, or
- **a developer applies the patch** in their own copy of
  trade-imports-plants-frontend (`git apply --3way upstream.patch`), updates the
  tests the brief lists, runs the tests and raises the pull request there. The
  file paths are the same in both repositories.

### When the patch does not apply cleanly

Your design release is a snapshot of the real journey on the day it was made.
If the real team has since changed the same lines, the patch cannot apply
on its own. The brief's "Has the real journey moved on?" section names those
files. Either the real team merges them by hand, or you start a fresh release
and carry your change across (see [Design releases](design-releases.md)),
then hand off again.

## Quick reference

- "save my work": save the change on your branch.
- "make a pull request": send it to GitHub and open a pull request (Claude
  asks first).
- "undo my last change": add an undo for the last saved change.
- "throw away what I just did": drop changes you have not saved.
- "hand this to the real team": write the hand-off folder.

The commands behind these, if you want them:

- `npm run designer:check -- --set <release> --full`
- `npm run designer:handoff -- --set <release> --slug <a-few-words>`
  (add `--dry-run` to try it without writing to `handoffs/`)
