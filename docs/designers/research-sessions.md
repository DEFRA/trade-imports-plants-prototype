# Research sessions

How to get the plants prototype ready for a round of user research, and put it
back afterwards. Say "get ready for research" to Claude and it follows these
steps with you (the `research-session` skill).

## What you end up with

- A **research release**: a design release made for this round, for example
  `plants-research-arrival-202610`. The real journey (high-risk-plants) is never
  changed.
- One **task link** per research task. Each opens the page where the task
  starts, already filled in up to that point. The links keep working after the
  prototype restarts.
- **Errors** that behave the way you chose (see below).
- A **participant sheet** to print or keep open during the session.

## Choosing how errors behave

**Realistic** is the default. Participants see every error the real service
shows. Nothing changes.

**Let participants through** switches off the errors you choose, on the pages
you choose. For example, participants can leave the arrival date blank. This is
called research mode. It is:

- **one saved change** titled "Research mode on for <your release>",
- **logged** in `research-mode.md` in your release, with one line per error
  switched off, saying what participants can now do and what the real service
  does instead,
- **visible**: the prototypes page shows a "Research mode on" tag on your
  release while it is on,
- **undone in one step** afterwards.

Some things cannot be switched off, because the real service's engine insists on
them: the commodity type and the country of origin. Start those tasks from an
example that already has them.

Research mode is never allowed on high-risk-plants or on a frozen release.

## The commands Claude runs

You do not need to type these, but it helps to know them.

| Command                                         | What it does                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `npm run designer:research -- status <release>` | Says whether research mode is on, and which errors are off.         |
| `npm run designer:research -- on <release>`     | Saves the switched-off errors as the one "Research mode on" change. |
| `npm run designer:research -- off <release>`    | Undoes that change. Every error comes back.                         |
| `npm run designer:research -- sheet <release>`  | Makes the participant sheet.                                        |

The sheet is written to `.cache/designer/research/<release>/sheet.html`. The
tasks it lists come from `research-session.json` in your release.

## Before the session

1. **Merge the day before.** The deployed prototype only changes after your work
   is merged to `main`. Share it ("save my work", then a pull request) and get it
   merged in good time (see "Getting it merged" in
   [Saving, sharing, undoing and handing off](sharing-and-handing-off.md)).
   **Not deployed yet?** The prototype has no deployed address yet (see "The
   deployed prototype" in PROTOTYPE.md). Until it has, run the sessions from
   the facilitator's laptop with `npm run designer:fresh`: the same
   prototype, but every restart starts from the examples. The sheet then has
   only local links.
2. **Open every task link** on the prototype you will use, once.
3. **Check at phone width** if participants might use a phone. Ask Claude to
   "show my pages at phone width".
4. **Reset** before the first participant.

## Reset between participants

Every participant who opens a task link opens the same example notification.
Reset puts the examples back as they were.

1. Open the prototypes page (the address ending in `/`).
2. Under your release, select **Reset this prototype’s data**.

Reset clears your release's data **for everyone** using that prototype, including
anyone else running a session at the same time. Agree session times with anyone
else using the same release.

## Signing in

- **On your computer** (`npm run dev`): you are signed in straight away.
- **Deployed prototype**: sign in through the Defra ID stub and pick any of its
  test users. Every test user sees the same examples.

## After the sessions

Say "turn errors back on". Claude runs `designer:research -- off`, which undoes
the research-mode change with a new saved change. The tag disappears from the
prototypes page. Merge it to update the deployed prototype.

If you share what you found, Claude can turn it into a list of changes for your
next working release, each with the skill that makes it. Findings go into a
working release, not the research release.

## Why research mode never ships

Research mode makes the prototype less strict than the real service. If you later
say "hand this to the real team", the hand-over lists every line of
`research-mode.md` as "cannot ship". Turn research mode off before you hand
anything over.

## Related

- [Design releases](design-releases.md): making the research release.
- [Example data](example-data.md): the examples behind each task link.
- [Seeing your change](seeing-your-change.md): photographing pages, error states
  and phone width.
- [Sharing and handing off](sharing-and-handing-off.md): saving, pull requests
  and undo.
