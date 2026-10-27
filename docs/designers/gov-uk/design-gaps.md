# Design gaps

A design gap is something your design asks for that was not built. For
example: a colour that is not a GOV.UK tag colour, working tabs, a sticky
button bar, or a new link in the header.

Something you asked to have built on purpose is a
[release pattern](release-patterns.md) instead.

## What happens to a gap

When Claude meets a gap, it does two things:

1. It builds the nearest GOV.UK option, so your page still works and still
   looks close to the design.
2. It adds a row to your release's gap log, at
   `src/server/app/sets/<your-release>/design-gaps.md`.

Each row says:

- **Page**: which page
- **What the design wants**: your ask, in your words
- **Closest option built**: what is on the page now
- **Why**: why it was not built
- **Frame**: the Figma frame or screenshot it came from

The log is yours: it lives inside your release. When you hand a change to the
real team, the `hand-off` skill puts every row in the brief, so the plants
team sees what you wanted as well as what you built.

## Why not just build it?

You can, when your research needs it.

GOV.UK services do have custom patterns. The real plants service has its
own task list, date picker styles and address picker. What a custom
pattern needs is a reason, and then evidence from real users that it works.

An Alpha prototype is where that evidence comes from. So when GOV.UK and
MoJ have nothing that does the job, tell Claude what you want research to
learn, and it builds the pattern in your release. A hypothesis your next
round will test is reason enough: findings can follow. Switching on a
GOV.UK or MoJ component that is already installed, such as Tabs, needs
only you asking.

Claude records your words and each pattern in your release, and keeps the
pattern inside it. It reaches the real service as a pattern request
carrying your evidence, and the plants team build it properly there.

When research does not need the real thing, a gap is still the lighter
route. It keeps the decision visible and costs nothing to change. See
[release patterns](release-patterns.md) for how to ask.

## Things that are always gaps

- The header, service navigation, phase banner and footer. They are shared by
  every page of every set and belong to the real service.
- A change to the real service's own styles and scripts in `src/client`.

## Things that can be a release pattern

These are gaps until you ask for them:

- MoJ components other than the date picker, which render unstyled here
  until they are switched on.
- GOV.UK components whose script is not switched on (tabs, accordion,
  character count, password input, file upload, exit this page), when the
  design needs their full behaviour.
- Anything that needs new styles or a script.

## Closing a gap

A row is never deleted. When a gap is solved (for example the real service
adds the tabs script), its "Why" column is changed to start with "Closed:"
and says how.
