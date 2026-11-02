# Release patterns

## MoJ filter on the filter playground

- Kind: Switch on
- Components: moj Filter, moj Action bar, moj Filter toggle button
- Pages: filter-playground
- Files: assets/styles.scss, assets/scripts.js
- Need or hypothesis: try the MoJ filter a list pattern on a list of plant consignments.
- Asked by: "can we test creating a custom component in the plants journey. I'd like to be able, for example, to use this filter pattern from MoJ: https://design-patterns.service.justice.gov.uk/components/filter/ ... Can I create a new page so I can play with this component?" (m-2026-10-27-1)
- Status: Closed: replaced on 27 October 2026 by the GOV.UK finder layout (search box, checkboxes in a one-third column, results list), built from GOV.UK Frontend alone, because the designer found the MoJ filter did not follow GOV.UK design standards.

## Dashboard summary counts

- Kind: Custom
- Pages: dashboard
- Classes: app-plants-working-summary, app-plants-working-summary__items, app-plants-working-summary__item, app-plants-working-summary__title, app-plants-working-summary__title--action, app-plants-working-summary__hint, app-plants-working-summary__count, app-plants-working-summary__count--action, app-plants-working-summary__count--updates, app-plants-working-summary__link
- Files: assets/styles.scss, assets/_summary.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Summary list and Table show a count as small text. Neither has a 64px count with a blue rule above.
  - MoJ: Badge and Sub navigation show a count as a small badge, not a headline figure.
- Need or hypothesis: users see what needs their attention before they read the list, and go straight to it from the count.
- Research round: next round
- Findings: none yet
- Asked by: "Use custom code if you need to in order to match it exactly." (m-2026-11-02-1)
- Status: Open

## Dashboard search bar

- Kind: Custom
- Pages: dashboard
- Classes: app-plants-working-toolbar, app-plants-working-toolbar__search, app-plants-working-toolbar__sort, app-plants-working-search, app-plants-working-search__field, app-plants-working-search__button, app-plants-working-search__icon
- Files: assets/styles.scss, assets/_search.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Text input has no attached search button, and the search box in the GOV.UK header is part of the shared header.
  - MoJ: Search has no hint line and no sort select on the same row.
- Need or hypothesis: a search box with its button attached, and sort on the same row, is quicker to use than a stacked search form.
- Research round: next round
- Findings: none yet
- Asked by: "Use custom code if you need to in order to match it exactly." (m-2026-11-02-1)
- Status: Open

## Dashboard additional filters bar

- Kind: Custom
- Pages: dashboard
- Classes: app-plants-working-filters, app-plants-working-filters__summary, app-plants-working-filters__body
- Files: assets/styles.scss, assets/_filters.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Details opens a text block under a blue underlined link, with no grey bar and no chevron.
  - MoJ: Filter is a side panel with its own layout, and its styles are not switched on here.
- Need or hypothesis: users find the extra filters when they sit in a grey bar under the search box, and leave them closed until needed.
- Research round: next round
- Findings: none yet
- Asked by: "Use custom code if you need to in order to match it exactly." (m-2026-11-02-1)
- Status: Open

## Dashboard notification card

- Kind: Custom
- Pages: dashboard
- Classes: app-plants-working-card, app-plants-working-card--attention, app-plants-working-card__header, app-plants-working-card__type, app-plants-working-card__reference, app-plants-working-card__actions, app-plants-working-card__details, app-plants-working-card__key, app-plants-working-card__value, app-plants-working-card__footer
- Files: assets/styles.scss, assets/_card.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Summary card lists its details in one column of rows, with no side bar and no commodity line above the reference.
  - MoJ: Card has no header with actions and no details grid.
- Need or hypothesis: users scan a card with its details in four columns, and the red bar on a late notification, faster than a one-column list.
- Research round: next round
- Findings: none yet
- Asked by: "Use custom code if you need to in order to match it exactly." (m-2026-11-02-1)
- Status: Open
