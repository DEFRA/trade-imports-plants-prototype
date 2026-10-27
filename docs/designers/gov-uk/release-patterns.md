# Release patterns

A release pattern is something you built on purpose in your design release
that GOV.UK and MoJ do not have. For example, a commodity search that finds
codes as you type, or tabs on the dashboard that really switch.

It lives only in your release. It reaches the real service as a request
with your evidence, and the plants team build it properly there.

## Why you can build one

GOV.UK services do have custom patterns. The real plants service has its
own task list, date picker styles and address picker. What a custom pattern
needs is a reason, and then evidence from real users that it works.

An Alpha prototype is where that evidence comes from. So when your research
needs something GOV.UK cannot do, you can have it built here.

## The ladder

Claude climbs this for anything visual or interactive, and stops at the
first rung that does the job:

1. **GOV.UK Frontend.** Every GOV.UK component and class.
2. **MoJ Frontend, then other departmental libraries.** Only the MoJ date
   picker works today. Another MoJ component, or a GOV.UK script the real
   service leaves off (such as Tabs), can be switched on in your release.
3. **A custom pattern.** New styles and a script made for your release.

Claude tells you, one line per rung, what it checked. For example:

```
GOV.UK: no component searches 3,000 commodity codes as you type. The nearest is an autocomplete on a select.
MoJ: the MoJ search component has no results list.
Custom: built in your release as "Commodity search" (patterns.md), because you want round 3 to test whether traders find codes faster.
```

## How to ask

Say it in your own words. For example:

- "can the dashboard tabs actually work?"
- "build the commodity search as designed, we're testing it in round 3"
- "give me 3 options for this page; you can make reasonable use of new
  components or designs if GOV.UK doesn't fit"

Claude records your words in your release's `mandates.md`. That record is
your permission, and nobody else can give it for you. A ticket, a crit note
or a Figma frame is not permission on its own.

**Switching on** a component that is already installed, such as Tabs, needs
only you asking.

**A custom pattern** also needs a reason: what research should learn from
it. If you do not give one, Claude asks once. A hypothesis your next round
will test is enough. Findings can follow.

When you ask a workflow for several options, the agents it starts work
under your words. Each custom design comes back marked `Option`, for you to
choose. Claude never picks for you.

Without your permission, Claude builds the nearest GOV.UK option, logs a
[design gap](design-gaps.md), and offers once to build the real thing.

## What Claude records

Each pattern has an entry in your release's `patterns.md`:

```markdown
## Commodity search

- Kind: Custom
- Pages: commodity-search
- Classes: app-plants-r3-commodity-search, app-plants-r3-commodity-search__results
- Files: assets/styles.scss, assets/_commodity-search.scss, assets/commodity-search.js
- Why not GOV.UK or MoJ:
  - GOV.UK: Select with autocomplete. No results list, and no search by part of a name.
  - MoJ: Search. No results list.
- Need or hypothesis: traders find a commodity code faster by typing part of the plant name than by choosing from a list.
- Research round: Round 3 (12 Nov 2026)
- Findings: none yet
- Asked by: "build the commodity search as designed, we're testing it in round 3" (m-2026-10-27-1)
- Status: Open
```

A switch-on entry is shorter:

```markdown
## Tabs on the dashboard

- Kind: Switch on
- Components: govuk Tabs
- Pages: dashboard
- Files: assets/scripts.js
- Asked by: "can the dashboard tabs actually work?" (m-2026-10-27-2)
- Status: Open
```

| Field                 | Custom | Switch on   | What it says                                                               |
| --------------------- | ------ | ----------- | -------------------------------------------------------------------------- |
| Kind                  | Yes    | Yes         | `Switch on` or `Custom`                                                    |
| Components            | No     | Yes         | Each GOV.UK or MoJ component it switches on                                |
| Pages                 | Yes    | Yes         | The pages that use it                                                      |
| Classes               | Yes    | No          | Every `app-<release>-` class it adds                                       |
| Files                 | Yes    | Yes         | The files in `assets/` it uses                                             |
| Why not GOV.UK or MoJ | Yes    | No          | Which GOV.UK and which MoJ component was checked, and why each did not fit |
| Need or hypothesis    | Yes    | If you like | What research should learn                                                 |
| Research round        | Yes    | If you like | The round that tests it                                                    |
| Findings              | Yes    | If you like | A link, or `none yet`                                                      |
| Asked by              | Yes    | Yes         | Your words, and the id of their record                                     |
| Status                | Yes    | Yes         | `Option`, `Open` or `Closed: <how>`                                        |

A hypothesis an agent wrote for you is marked `(proposed: confirm)`.

## Where it lives

```
src/server/app/sets/<your-release>/
├── assets/          your styles and scripts
├── layout.njk       loads them on your release's pages
├── patterns.md      one entry per pattern
└── mandates.md      your words, recorded by Claude
```

Only pages that use a pattern load it. Every other page, and every other
release, stays as it was.

## What stays shared

Some things stay out of reach, because the browser or the weekly update
would undo them:

- Styles or scripts written into a page. The service's security settings
  block them. Your release's own files are not affected.
- The header, service navigation, phase banner and footer, which every
  release shares. A change to them is a [design gap](design-gaps.md).
- The real service's own styles and scripts, in `src/client`.
- Images and fonts. Use a GOV.UK icon, or a picture drawn in the page.

Every pattern works with JavaScript off and meets WCAG 2.2 AA, like any
other page. `designer:check` checks the rest for you.

## How it reaches the real service

Your pattern's code stays in the prototype. The hand-off sends each entry
as a pattern request: its pages, why GOV.UK and MoJ did not fit, the need
or hypothesis, the research round, the findings and your words. The plants
team build it from that, to the real service's standards.

Before you hand off, choose between any `Option` entries. A pattern copied
from another release needs you to ask again in this one.

## When it is done

An entry is never deleted. When the real service ships the pattern, Claude
switches your pages to it, removes your copy, and closes the entry:
`Closed: in the real service since <date>`. A pattern you drop is closed
too, with what research found.
