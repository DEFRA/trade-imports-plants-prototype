# The design gaps log

A design gap is something the design asks for that this prototype cannot
build with the GOV.UK toolbox the real service loads. Each release keeps its
own log at `src/server/app/sets/<release-id>/design-gaps.md`. The log is the
designer's own file (it sits inside the release), and `hand-off` copies its
rows into the brief for the plants team.

Log a gap when:

- the nearest GOV.UK option was built instead of what the design shows
- the ask needs Sass, client JavaScript, a new webpack entry or a change to
  `src/client/**`
- the ask needs the shared layout (`src/server/app/shared/layout.njk`): the
  header, service navigation, phase banner or footer
- a component would render unstyled or without its script (see
  `components-we-have.md`)

Do not log a gap for a difference the designer is happy with.

## The file

Create the file the first time a release needs it, with exactly this heading
and table header. Add one row per ask, newest last. Never delete a row: when a
gap is closed, change its "Why" cell to start with "Closed:" and say how.

```text
# Design gaps: <release-id>

Things the design asks for that the GOV.UK toolbox in this prototype cannot
build yet. Each row travels with the hand-off brief.

| Page | What the design wants | Closest option built | Why | Frame |
| --- | --- | --- | --- | --- |
```

## The columns

- **Page**: the page slug, for example `arrival-details`, or `dashboard`,
  `hub`, `all pages` for the header.
- **What the design wants**: the ask in the designer's words, short. For
  example "Status tag in navy (#1d3f6e)".
- **Closest option built**: what is on the page now, with the class or macro.
  For example "`govukTag` with `govuk-tag--blue` (default blue)". Write
  "Nothing" when nothing could be built.
- **Why**: why the toolbox cannot do it, in one plain sentence. For example
  "GOV.UK tags come in 9 fixed colours; a new colour needs Sass in the real
  service."
- **Frame**: the Figma frame name or link, or the screenshot's file name. Write
  "None" when the ask came in words.

Keep each cell on one line. Escape a pipe character inside a cell as `\|`.

## A worked row

```text
| dashboard | Status tag in navy (#1d3f6e) | `govukTag` with `govuk-tag--blue` (default blue) | GOV.UK tags come in 9 fixed colours; a new colour needs Sass in the real service. | Dashboard v4 (Figma) |
```

## Content notes

`change-the-words` also logs notes for the content designer here, so they
travel with a hand-off. A content note starts its second cell with
`Content note:`, and the hand-off brief lists it under "Content notes", not
as a design gap:

```text
| task-list | Content note: "3. Consignment addresses" also holds Identification numbers, which is not an address. | No change: the words are as the designer asked | Content designer to review | None |
```
