# Components in this prototype

The workspace's own
`~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md`
is the source of truth for what each GOV.UK component is and when to use
it. Read that first. This page only covers what is different because it is
running in this prototype rather than a fresh GOV.UK service.

Each component is a Nunjucks macro, such as
`govukButton({ text: "Continue" })`. The full list, with the line that
imports each one and a page here that already uses it, is in the workspace
`prototype` skill's match-the-design reference, at
`~/git/defra/trade-imports-workspace/.claude/skills/prototype/references/match-the-design/components-we-have.md`.

## What works fully here

Most GOV.UK components work exactly as on GOV.UK. A few need a small script
that the real service has not switched on, so they show their "JavaScript
off" version:

- **Tabs** show a list of links, then every panel one after another.
- **Accordion** shows every section open.
- **Character count** does not count as you type.
- **Password input** has no "Show" button.
- **File upload** is a plain file picker.
- **Exit this page** is a plain link.

Of the MoJ (Ministry of Justice) components, only the date picker works. The
filter layout, sub navigation, badge, timeline, button menu and the rest
render as plain, unstyled HTML.

Switching any of these on is a change to the real service. Ask for it as a
design gap (see [design gaps](design-gaps.md)).

## Page furniture

The header, phase banner, service navigation and footer are drawn by the
shared layout. They are the same on every page of every set and belong to
the real service: a change to them is always a design gap, never an edit.
Breadcrumbs are not used in this service: a page has one route back (the
back link) and one route up (the service navigation).
