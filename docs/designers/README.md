# Designer documents

## Just say what you want

You do not need to read these documents, learn the commands or know the
names of anything. Open Claude Code (or Cursor) in the prototype's folder and
say what you want in your own words: "we've got a demo on Thursday, get it
ready", "the dashboard should show which ones are overdue", "write this up as
a story for the developers". Claude works out what that means, does each
part, checks it, shows you pictures and tells you what to click. If Claude
seems lost, say "use the design skill".

[PROTOTYPE.md](../../PROTOTYPE.md) has a table of things you can ask for.

These documents explain what is going on behind that. Read them when you are
curious, or when something surprises you.

## Start here: your first hour

[Your first hour](your-first-hour.md) takes you from nothing to a shared
change: install, run the prototype, sign in, reset the data, start your first
design release, change some words, see the change and share it.

Then keep [the glossary](glossary.md) to hand. It explains every term these
documents use.

## The loop, in order

Every change goes round the same loop: find whose file it is, make the
change, check it, see it, share it, and, when it should become real, hand it
to the real team.

| Step                           | Read this                                                              | What it covers                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1. Whose file is it?           | [Where your changes go](where-changes-go.md)                           | What is yours, what belongs to the real service, and what the weekly update does                    |
| 2. Have your own copy          | [Design releases](design-releases.md)                                  | Working, frozen and research releases; freeze, carry and retire                                     |
| 3. Change the words            | [Wording and Welsh](wording-and-welsh.md)                              | Where words live, Welsh and the `[Welsh needed]` marker, the Welsh report                           |
| 3. Change the look             | [GOV.UK design in this prototype](gov-uk/README.md)                    | Components, patterns, styles, accessibility and design gaps                                         |
| 3. Change the flow             | [Journey recipes](recipes/README.md)                                   | Branches, moving pages, guidance pages, the task list, check your answers, confirmation, validation |
| 3. Change the data             | [Example data](example-data.md)                                        | Example notifications, stable example links, extra parties, ports and countries                     |
| 3. Add what the real one lacks | [Services and dashboards](services-and-dashboards.md)                  | Prototype-owned services: transporters, templates, dashboard filters, tabs and counts               |
| 3. Bring over an old page      | [Bringing over a page from the old prototype](porting-old-pages.md)    | Rebuilding a Prototype Kit page in your release, with a fidelity table                              |
| 3. Work through notes          | [Working through crit or research notes](working-through-notes.md)     | A list of changes in one go: each checked, failures parked, one gallery, one save per change        |
| 3. Research                    | [Research sessions](research-sessions.md)                              | A research release, one link per task, errors off and on, the session sheet                         |
| 4. Check it                    | [Checks and errors](checks-and-errors.md)                              | The three check levels and every error explained                                                    |
| 5. See it                      | [Seeing your change](seeing-your-change.md)                            | The gallery: before and after, error states, phone width, Figma, video                              |
| 6. Share it and make it real   | [Saving, sharing, undoing and handing off](sharing-and-handing-off.md) | Branches, save messages, pull requests, undo, and the hand-off to the real team                     |

## GOV.UK design, in more depth

- [Components](gov-uk/components.md)
- [Patterns](gov-uk/patterns.md)
- [Styles](gov-uk/styles.md)
- [Accessibility](gov-uk/accessibility.md)
- [Language](gov-uk/language.md)
- [Service design](gov-uk/service-design.md)
- [Templates in this prototype](gov-uk/templates-in-this-prototype.md)
- [Design gaps](gov-uk/design-gaps.md)

## Journey recipes, one by one

- [Show a page only when an answer says so](recipes/add-a-branch.md)
- [Move a page](recipes/move-a-page.md)
- [Add a guidance page](recipes/guidance-page.md)
- [Change the task list](recipes/task-list.md)
- [Change check your answers](recipes/check-answers.md)
- [Change the confirmation page](recipes/confirmation-variant.md)
- [Change what counts as a valid answer](recipes/validation-rules.md)

## Elsewhere in the repo

- [The designer's guide](../../PROTOTYPE.md): what to say to Claude, how
  close the prototype is to the real service, and deploying and merging.
- [Hand-offs](../../handoffs/README.md): the briefs and patches made for the
  real team.

## For maintainers: how requests are routed

Designers never need this. Every agent (Claude Code, Cursor, Codex, Copilot)
routes a request with `AGENTS.md`: its "Working out what they want" steps,
its Outcomes table and its Phrases table. Each route names a steps file,
`.claude/skills/<skill>/SKILL.md`, so it works whether or not the host loads
skills. The skills are `design` (the front door: "use the design skill"),
`run-the-prototype`, `design-release`, `change-the-words`,
`match-the-design`, `port-a-kit-page`, `change-the-journey`, `example-data`,
`fake-a-service`, `research-session`, `check-my-change`, `show-my-change`,
`share-my-change` and `hand-off`. `CLAUDE.md` imports `AGENTS.md` and adds
only what is particular to Claude Code. A new skill needs a row in
`AGENTS.md` and its own line in `ours` in `overrides.json`;
`scripts/designer/suite.test.js` fails until it has both.
