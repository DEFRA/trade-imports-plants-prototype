# From a Figma frame to GOV.UK classes

Use this page to turn each difference you see between the page and the design
into a GOV.UK Frontend class or macro. The values come from the installed
`govuk-frontend` 6.4.0 (checked against
`node_modules/govuk-frontend/dist/govuk/settings/`).

The rule for every difference: pick the nearest step on the GOV.UK scale.
Never write a pixel value, a `style` attribute or new Sass. If the nearest step
is not close enough for the designer, build the nearest step anyway and add a
row to the release's `design-gaps.md`.

## Spacing

GOV.UK spacing is a 10-step scale. Steps 0 to 3 are the same at every width.
Steps 4 to 9 are smaller on phones (below 641px wide) than on tablets and
desktops.

| Step | Phone | Tablet and desktop |
| ---- | ----- | ------------------ |
| 0    | 0     | 0                  |
| 1    | 5px   | 5px                |
| 2    | 10px  | 10px               |
| 3    | 15px  | 15px               |
| 4    | 15px  | 20px               |
| 5    | 15px  | 25px               |
| 6    | 20px  | 30px               |
| 7    | 25px  | 40px               |
| 8    | 30px  | 50px               |
| 9    | 40px  | 60px               |

To match a gap in the design, measure it at desktop width and pick the step
whose desktop value is closest. When two steps are equally close, pick the
larger one: GOV.UK pages err towards space.

- Space below an element: `govuk-!-margin-bottom-<step>`.
- Space above an element: `govuk-!-margin-top-<step>`.
- Space on the left or right: `govuk-!-margin-left-<step>` or
  `govuk-!-margin-right-<step>`.
- Space on every side: `govuk-!-margin-<step>`.
- Space inside a box: `govuk-!-padding-<step>`, and the `-top-`, `-right-`,
  `-bottom-` and `-left-` forms.
- The same gap on phones as on desktops: `govuk-!-static-margin-bottom-<step>`.
  Every margin and padding class has a `static` form.
- No gap at all: `govuk-!-margin-bottom-0`.

The gap below a heading or paragraph is its own bottom margin:

| Class              | Bottom margin (phone / desktop) | Step |
| ------------------ | ------------------------------- | ---- |
| `govuk-heading-xl` | 30px / 50px                     | 8    |
| `govuk-heading-l`  | 20px / 30px                     | 6    |
| `govuk-heading-m`  | 15px / 20px                     | 4    |
| `govuk-heading-s`  | 15px / 20px                     | 4    |
| `govuk-body`       | 15px / 20px                     | 4    |

So "make the gap under the heading 10px" on a `govuk-heading-l` means adding
`govuk-!-margin-bottom-2` to the `h1`.

Where the element is a macro, pass the class in `classes`, for example
`govukInsetText({ text: copy.intro, classes: "govuk-!-margin-top-0" })`. For a
form field, the space lives on its form group:
`formGroup: { classes: "govuk-!-margin-bottom-4" }`.

## Type

- Very large page title (48px): `govuk-heading-xl`, with
  `sectionCaption(caption, "govuk-caption-xl")` above it.
- Standard page title (36px): `govuk-heading-l`, with `sectionCaption(caption)`.
- Section heading (24px): `govuk-heading-m` on an `h2`.
- Sub-section heading (19px bold): `govuk-heading-s` on an `h3`.
- Lead paragraph (24px): `govuk-body-l`, at most one per page.
- Body text (19px): `govuk-body`.
- Small text (16px): `govuk-body-s`.
- Grey caption above a heading: `govuk-caption-xl`, `govuk-caption-l` or
  `govuk-caption-m`.
- Grey supporting text: `govuk-hint` on a `div` or `p`.
- Bold words: `govuk-!-font-weight-bold`, or `<strong>` when the bold carries
  meaning.
- Remove bold (for example from a label): `govuk-!-font-weight-regular`.
- A size between the steps: the nearest step, plus a `design-gaps.md` row if
  the difference matters to the designer.
- A different typeface, italics or all capitals: not available. Log a gap.

Size overrides exist for when a heading level must stay but its size must
change: `govuk-!-font-size-80`, `-48`, `-36`, `-27`, `-24`, `-19` and `-16`.
Prefer the heading and body classes: they set line height and spacing too.

Headings keep their level for screen readers. To make an `h2` look smaller,
change its class to `govuk-heading-s`. Never swap it to an `h4` for size.

## Width and layout

Every page starts at two-thirds width. The page's controller sets this, not
the template.

- The page uses the full width: in the release's controller, add
  `contentColumnClass: kit.surfaceClass('display')` to the view model. The
  dashboard, check your answers and address pickers already do this.
- Two columns inside the page: `<div class="govuk-grid-row">` holding
  `govuk-grid-column-one-third` and `govuk-grid-column-two-thirds`. The
  dashboard does this for its search box.
- Columns only on desktop: `govuk-grid-column-one-half-from-desktop` and the
  other `-from-desktop` classes.
- A narrower text input: `classes: "govuk-input--width-<n>"`, where n is 2, 3,
  4, 5, 10, 20 or 30 characters.
- A proportional input or select: `classes: "govuk-!-width-one-half"`. Also
  `-full`, `-three-quarters`, `-two-thirds`, `-one-third` and `-one-quarter`.
- A wider textarea: textareas already fill the column. Widen the column.
- Centred or right-aligned text: `govuk-!-text-align-centre` or
  `govuk-!-text-align-right`. Use rarely: GOV.UK text is left-aligned.
- Hidden on screen but read out by screen readers: `govuk-visually-hidden`.
- Hidden completely: do not render it. `govuk-!-display-none` also exists.
- Things side by side on one line: a `govuk-button-group` for buttons and
  links, or `govuk-!-display-inline-block`.
- A thin line between sections:
  `<hr class="govuk-section-break govuk-section-break--m govuk-section-break--visible">`.
  Use `--l` or `--xl` for more space around it.

Changing `contentColumnClass` is the only controller edit `match-the-design`
makes. It is a view setting, and a release's controller is the designer's own.
Any other controller change belongs to `change-the-journey`.

## Colour

A template cannot set a colour. Colour comes only from a component that
carries it.

- A coloured status label: `govukTag` with a colour class. The colours are
  `govuk-tag--grey`, `--green`, `--teal`, `--purple`, `--magenta`, `--red`,
  `--orange` and `--yellow`.
- A blue status label: blue is the default tag colour. This codebase still
  writes it as `govuk-tag--blue` (see the Draft tag in
  `src/server/app/shared/kit.js`), so use that class to keep the intent
  readable. In 6.4 the class adds no style of its own, so the tag shows the
  default blue.
- `govuk-tag--turquoise` and `govuk-tag--pink` still work but are deprecated:
  use `--teal` and `--magenta`. `govuk-tag--light-blue` no longer exists.
- A green success box: `govukNotificationBanner({ type: "success", ... })`.
- A blue information box: `govukNotificationBanner` with no type.
- A green confirmation block: `govukPanel`.
- A grey bar beside a paragraph: `govukInsetText`.
- A bold warning with an icon: `govukWarningText`.
- A red button, for destructive actions only:
  `govukButton({ classes: "govuk-button--warning" })`.
- A grey button: `govukButton({ classes: "govuk-button--secondary" })`.
- A link in text colour or grey: `govuk-link govuk-link--text-colour` or
  `govuk-link govuk-link--muted`.
- Red error text: only through a field's `errorMessage` and the error summary.
- Any other colour, or a coloured background: not available. Build the nearest
  option above and log a gap.

## Borders, shadows, rounded corners and icons

GOV.UK Frontend has no classes for these. The only borders come with
components: summary cards (`govukSummaryList` with a `card`), the inset text
bar, tables and section breaks. The only icons come with the warning text, the
start button arrow and the task list statuses. Build the nearest component and
log a gap for the rest.

## Moving things on a page

To move an element up or down the page, move its lines in the template. Keep:

- the error summary include first
- the section caption straight above the `h1`
- the hidden `crumb` and `concurrencyToken` inputs inside the form
- `saveActions` last in the form

Moving a whole question to another page is a journey change, not a layout
change: use `change-the-journey`.
