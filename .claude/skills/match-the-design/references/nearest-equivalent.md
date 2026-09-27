# Nearest GOV.UK equivalents

The old Prototype Kit prototype built many screens from its own `app-*`
markup, Sass and JavaScript. This prototype cannot: it uses only what the real
service loads. For each bespoke pattern below, build the GOV.UK option and, if
the designer needs the original look or behaviour, add a row to
`design-gaps.md` so the real team sees the ask.

Every row says:

- **Build**: what to put on the page
- **Gap**: whether to log a design gap, and what to write in it

## Custom dropdown or searchable select

- Build: `govukSelect` for up to about 20 options. For a long list, or when
  people know what they are looking for, `appAccessibleAutocomplete` (see
  `journeys/linear/features/origin/template.njk`). It degrades to a plain
  select without JavaScript.
- Gap: only if the design shows something neither can do, for example
  several selections in one box or rich option text.

## Search a list, then pick one

- Build: a GET form with a `govukInput` and a secondary "Search" button, then
  the results as `govukRadios` or a `govukTable`, with `govukPagination`. The
  consignor, contact and destination pickers do this
  (`journeys/linear/features/consignor-select/template.njk`).
- Gap: live filtering as you type.

## Pop-up dialog (modal)

- Build: a separate confirm page with a warning and two buttons, as
  `journeys/linear/features/delete-notification/template.njk` and
  `cancel-amend/template.njk` do. Use `fake-a-service`'s
  `confirm-then-act.md` recipe for the route.
- Gap: always, if the designer wants the modal. GOV.UK advises against modals.

## Cards

- Build: summary cards (`govukSummaryList` with `card`). See the dashboard.
- Gap: coloured, shadowed or image cards.

## Filter panel

- Build: the grid and GET form in `layout-patterns.md` ("A filter panel beside
  a list").
- Gap: yes: "MoJ filter layout needs its Sass loaded by the real service".

## Glance counts or statistic tiles

- Build: a summary list without borders, a one-row table or tags in a
  sentence (see `layout-patterns.md`).
- Gap: the large-number tile look.

## Tabs

- Build: see "Tabs on a dashboard" in `layout-patterns.md`.
- Gap: yes: "Tabs need `createAll(Tabs)` in the real service".

## Accordion or "show more"

- Build: `govukDetails` for one hidden block (works with no script). Several
  `govukDetails` one after another for a short set. `govukAccordion` shows
  every section open here.
- Gap: open-and-close behaviour for an accordion.

## Sticky action bar or sticky summary

- Build: nothing sticky. Put the buttons at the end of the form in
  `saveActions` or a `govuk-button-group`.
- Gap: always, if the designer wants it sticky.

## Coloured status chips (for example IPAFFS-style)

- Build: `govukTag` with the nearest colour class (see `figma-to-govuk.md`).
  Several tags side by side are fine.
- Gap: always for non-GOV.UK colours, outlines, icons in chips or rounded
  pills. When the aim is to compare against the incumbent service, say so in
  the gap's "Why" column.

## Custom header, service navigation or home page

- Build: nothing on the page. The header, service navigation, phase banner and
  footer live in `src/server/app/shared/layout.njk`, which every set shares and
  the real service owns.
- Gap: always. Write exactly what the design wants (new links, labels, a
  different home link) so the real team can decide.

## A different font size, colour or spacing value

- Build: the nearest step (see `figma-to-govuk.md`).
- Gap: only if the designer says the difference matters.

## Copy button, auto-dismissing banner, scroll-to or other small scripts

- Build: the static version (a plain banner, no copy button).
- Gap: always, naming the behaviour.

## Icons and illustrations

- Build: text. GOV.UK services use words, not icons, except in the components
  that carry their own.
- Gap: if the designer needs the icon.
