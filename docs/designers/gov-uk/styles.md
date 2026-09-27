# Styles

GOV.UK styles set type, spacing, layout and colour. In this prototype you set
them only with classes that start `govuk-`. There is no custom Sass: the real
service does not load any for design releases.

The full mapping from a Figma measurement to a class is in
`.claude/skills/match-the-design/references/figma-to-govuk.md`. This page is
the short version.

## Type

- Page headings: `govuk-heading-l` (36px) on most pages; `govuk-heading-xl`
  (48px) on the dashboard and overview.
- Section headings: `govuk-heading-m` (24px) on an `h2`.
- Sub-section headings: `govuk-heading-s` (19px bold) on an `h3`.
- Body text: `govuk-body` (19px). Keep almost everything at this size.
- A lead paragraph: `govuk-body-l` (24px), at most one per page.
- Small print: `govuk-body-s` (16px).
- Captions above a heading: `govuk-caption-l` with `govuk-heading-l`,
  `govuk-caption-xl` with `govuk-heading-xl`.

Use sentence case for every heading. On phones, headings shrink (for example
`govuk-heading-l` becomes 27px); body text stays at 19px.

## Spacing

Spacing comes in steps 0 to 9: 0, 5, 10, 15, 20, 25, 30, 40, 50 and 60 pixels
on desktop. Steps 4 to 9 are smaller on phones. Add space with classes such
as `govuk-!-margin-bottom-2` (10px below) or `govuk-!-padding-4`. Remove it
with `govuk-!-margin-bottom-0`.

Pick the nearest step to your design. If the nearest step is not close enough,
that is a design gap.

## Layout

- Pages are at most 1020px wide, and question pages use two-thirds of that,
  so lines stay about 75 characters long.
- Pages with tables or many records use the full width.
- Columns: `govuk-grid-row` holding `govuk-grid-column-one-third`,
  `-one-half`, `-two-thirds`, `-one-quarter`, `-three-quarters` or `-full`.
- Design for phones first: every page must work at 320px wide.

## Colour

You cannot set a colour directly. Colour comes with components:

- tags in grey, green, teal, purple, magenta, red, orange, yellow or the
  default blue
- the green panel on a confirmation page
- the blue or green notification banner
- the red warning button, for actions that delete or cannot be undone
- the grey secondary button

Never use colour as the only way to show meaning. A tag always has words.

## Do

- Keep body text at 19px.
- Use the spacing scale, not exact pixel values.
- Use sentence case.
- Check every page at phone width.

## Do not

- Change what a colour means (red is for errors and danger).
- Restyle buttons or form fields.
- Make your own heading styles.
