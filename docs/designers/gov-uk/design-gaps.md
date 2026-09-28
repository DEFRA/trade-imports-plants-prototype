# Design gaps

A design gap is something your design asks for that this prototype cannot
build with the GOV.UK toolbox the real plants service loads. For example: a
colour that is not a GOV.UK tag colour, working tabs, a sticky button bar, a
new link in the header, or anything that would need custom Sass or
JavaScript.

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
- **Why**: why the toolbox cannot do it
- **Frame**: the Figma frame or screenshot it came from

The log is yours: it lives inside your release. When you hand a change to the
real team, the `hand-off` skill puts every row in the brief, so the plants
team sees what you wanted as well as what you built.

## Why not just build it?

Because the aim of this prototype is to show things the real service can
build. A bespoke colour or widget made here would look finished but would not
exist in the real service, and would hide a decision the plants team needs to
make. The gap log keeps that decision visible and gathers the evidence: if the
same gap keeps coming up, that is the case for adding it to the service.

## Things that are always gaps

- The header, service navigation, phase banner and footer. They are shared by
  every page of every set and belong to the real service.
- Anything that needs new Sass, client JavaScript or a change to the files in
  `src/client`.
- MoJ components other than the date picker, which render unstyled here.
- GOV.UK components whose script is not switched on (tabs, accordion,
  character count, password input, file upload, exit this page), when the
  design needs their full behaviour.

## Closing a gap

A row is never deleted. When a gap is solved (for example the real service
adds the tabs script), its "Why" column is changed to start with "Closed:"
and says how.
