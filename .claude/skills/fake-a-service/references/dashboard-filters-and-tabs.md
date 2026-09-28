# Filters, tabs and counts on a release's dashboard

The dashboard lists the notifications a user's browser knows. In the real
service the backend does the listing, and it cannot filter by status, late or
arrival date yet. In a design release, the records wrapper
(`src/server/prototype-services/records/`) does it instead, so the dashboard
can have:

- **filters**: status, commodity, late only, arrival date from and to
- **tabs**: one list per group of statuses, for example Drafts, Submitted,
  Amended
- **counts**: how many in each status, each tab and late

All of it is fake: "needs a real service". The real backend would need the
same filters on its list endpoint.

All the changes are in the release's own dashboard feature,
`src/server/app/sets/<release>/journeys/linear/features/dashboard/`: the
`controller.js`, the `template.njk`, the `copy/` pair and, for paging,
`notification-helper.js`.

## Before you start

The release's gateway, `src/server/app/routes-<release>.js`, must wrap its
records:

```js
import { records } from './services/persistence/records/index.js'
import { designerRecords } from '../prototype-services/records/index.js'
// …
configureRecords(SET_ID, designerRecords(SET_ID, records))
```

`npm run new:set` writes this for a release copied from high-risk-plants. If
the gateway says `configureRecords(SET_ID, records)`, change it to the above.

## What the query string can say

`filtersFromQuery(request.query)` reads these, the way a `method="get"` form
sends them:

| Parameter            | Means                                                                     | Form field                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `status`             | `draft`, `submitted` or `amend`. Repeat it for several.                   | `govukCheckboxes` named `status`                                                                                                    |
| `commodity`          | Text the commodity name contains, any case.                               | `govukInput` named `commodity`                                                                                                      |
| `late`               | `yes` for late only, `no` for on time only.                               | a one-item `govukCheckboxes` named `late`, value `yes`                                                                              |
| `dateFrom`, `dateTo` | Earliest and latest arrival date.                                         | `govukDateInput` with `namePrefix: "dateFrom"` (sends `dateFrom-day`, `dateFrom-month`, `dateFrom-year`), or `YYYY-MM-DD` in a link |
| `tab`                | A tab id: `all`, `drafts`, `submitted`, `amended` (or the release's own). | a link, see "Tabs"                                                                                                                  |

It answers:

- `filters`: pass these to `listKnownWithFilters` and `countKnown`
- `values`: what the user typed, to put back in the form
- `errors`: `{ dateFrom: 'invalid' }` for a date that is not real,
  `{ dateTo: 'beforeFrom' }` for a "to" date before the "from" date. The words
  go in the dashboard's copy. A date with an error is not used to filter.
- `active`: true when any filter (not the tab) is in use

## Step 1: the controller

In the release's `features/dashboard/controller.js`:

1. Import the helpers (seven `../` reach `src/server/`):

   ```js
   import {
     countKnown,
     filtersFromQuery,
     listKnownWithFilters,
     STATUSES
   } from '../../../../../../../prototype-services/records/index.js'
   ```

   and remove `listKnownJourneys` from the `engine/journey.js` import (the
   linter refuses an unused import).

2. In `renderDashboard`, read the filters and use the wrapper's list in place
   of `listKnownJourneys`:

   ```js
   const { filters, values, errors, active } = filtersFromQuery(request.query)
   const listFor = (page) =>
     listKnownWithFilters(request, { page, sort, referenceNumber, ...filters })
   const counts = await countKnown(request, { referenceNumber, ...filters })
   ```

   `listKnownWithFilters` answers in exactly the shape `listKnownJourneys` did
   (`{ rows, page, size, totalElements, totalPages }`), so the rest of
   `renderDashboard` is unchanged.

3. Add to the object passed to `h.view(view, { … })`:

   ```js
   filters: values,
   filtersActive: active,
   counts,
   statusItems: STATUSES.map((status) => ({
     value: status,
     text: `${copy.filters.statuses[status]} (${counts.byStatus[status]})`,
     checked: values.status.includes(status)
   })),
   errorSummary: kit.errorSummary(
     Object.fromEntries(
       Object.entries(errors).map(([field, code]) => [
         field,
         copy.filters.errors[code]
       ])
     ),
     { href: (field) => `#${field}-day` }
   ),
   dateFromError: errors.dateFrom
     ? { text: copy.filters.errors[errors.dateFrom] }
     : undefined,
   dateToError: errors.dateTo
     ? { text: copy.filters.errors[errors.dateTo] }
     : undefined
   ```

4. Keep the filters in the paging links. In the release's
   `notification-helper.js`, give `buildDashboardListQueryString` a `filters`
   value and append each one:

   ```js
   export const buildDashboardListQueryString = ({
     page = 1,
     sort = DEFAULT_NOTIFICATION_SORT,
     referenceNumber,
     filters = {}
   } = {}) => {
     const params = new URLSearchParams()
     // … the page, sort and referenceNumber lines stay as they are …
     for (const [name, value] of Object.entries(filters)) {
       for (const item of [value].flat()) {
         if (item) {
           params.append(name, item)
         }
       }
     }
     const query = params.toString()
     return query ? `?${query}` : ''
   }
   ```

   add a `filters = {}` parameter to the end of `buildPaginationLinks`, pass it
   into `buildDashboardListQueryString` inside `pageLink`, and pass `filters`
   from the controller's call to `buildPaginationLinks`.

## Step 2: the filter panel

GOV.UK has no filter component loaded here. MoJ's filter layout is installed
but its styles are not, so it renders as plain HTML (see
`.claude/skills/match-the-design/references/layout-patterns.md`, "A filter
panel beside a list"). Build it from GOV.UK pieces in the dashboard's
one-third column, under or in place of the search form:

```njk
{% from "govuk/components/checkboxes/macro.njk" import govukCheckboxes %}
{% from "govuk/components/date-input/macro.njk" import govukDateInput %}

<form method="get" action="{{ listAction }}" novalidate>
  {% if sort %}
    <input type="hidden" name="sort" value="{{ sort }}" />
  {% endif %}

  {{ govukCheckboxes({
    idPrefix: "status",
    name: "status",
    classes: "govuk-checkboxes--small",
    fieldset: { legend: { text: copy.filters.statusLegend, classes: "govuk-fieldset__legend--s" } },
    items: statusItems
  }) }}

  {{ govukInput({
    id: "commodity",
    name: "commodity",
    label: { text: copy.filters.commodity, classes: "govuk-label--s" },
    value: filters.commodity
  }) }}

  {{ govukCheckboxes({
    idPrefix: "late",
    name: "late",
    classes: "govuk-checkboxes--small",
    items: [{ value: "yes", text: copy.filters.lateOnly + " (" + counts.late + ")", checked: filters.late == "yes" }]
  }) }}

  {{ govukDateInput({
    id: "dateFrom",
    namePrefix: "dateFrom",
    fieldset: { legend: { text: copy.filters.dateFrom, classes: "govuk-fieldset__legend--s" } },
    errorMessage: dateFromError,
    items: [
      { name: "day", classes: "govuk-input--width-2", value: filters.dateFrom.day },
      { name: "month", classes: "govuk-input--width-2", value: filters.dateFrom.month },
      { name: "year", classes: "govuk-input--width-4", value: filters.dateFrom.year }
    ]
  }) }}

  {# the same again for dateTo, with dateToError #}

  {{ govukButton({ text: copy.filters.apply, classes: "govuk-button--secondary" }) }}
  <p class="govuk-body">
    <a class="govuk-link" href="{{ listAction }}">{{ copy.filters.clear }}</a>
  </p>
</form>
```

Put `{% include "shared/error-summary.njk" %}` first in the page's
`journeyContent` block, so the error state has its summary.

Change the empty text: when `filtersActive` and there are no rows, show
`copy.filters.noMatches` ("No notifications match your filters") and the
"Clear filters" link, rather than "You have not started any notifications".

The copy to add to the dashboard's `copy/copy.en.js` (and the same keys in
`copy.cy.js`, with `[Welsh needed]` where there is no Welsh):

```js
filters: {
  statusLegend: 'Status',
  statuses: { draft: 'Draft', submitted: 'Submitted', amend: 'Being amended' },
  commodity: 'Commodity',
  lateOnly: 'Late notifications only',
  dateFrom: 'Arriving from',
  dateTo: 'Arriving by',
  apply: 'Apply filters',
  clear: 'Clear filters',
  noMatches: 'No notifications match your filters',
  errors: {
    invalid: 'Date must be a real date',
    beforeFrom: 'The "arriving by" date must be the same as or after the "arriving from" date'
  }
},
```

Log the MoJ filter look as a design gap (`design-gaps.md`) if the design shows
it.

## Step 3: tabs

**Never use the `govukTabs` macro in a release.** The GOV.UK Tabs script is
not started in this service, but the macro still marks every panel after the
first `govuk-tabs__panel--hidden`, and the GOV.UK styles hide those panels. So
only the first tab's list ever shows, and the other tabs cannot be opened. In
a picture it looks like working tabs, which hides the problem.

Build tabs on the server instead: each tab is a real link (`?tab=drafts`), and
only the open tab's list is rendered. It uses the GOV.UK tabs classes, so it
looks like GOV.UK tabs on a wide screen and like a list of links on a phone
(as GOV.UK tabs do), with no script. A research link can open a tab directly.

In the controller (import `DEFAULT_TABS` from the same `records/index.js`):

```js
const openTab = values.tab || 'all'
const keptQuery = (tab) =>
  buildDashboardListQueryString({ sort, referenceNumber, filters: { ...filters, tab } })
// …
openTab,
tabLinks: Object.keys(DEFAULT_TABS).map((tab) => ({
  id: tab,
  text: `${copy.tabs[tab]} (${counts.byTab[tab]})`,
  href: `${dashboardPath()}${keptQuery(tab)}`,
  current: openTab === tab
}))
```

`keptQuery` keeps the filters, the sort and the search when the tab changes
(it is the `buildDashboardListQueryString` from step 1, with the tab added).
The list itself already follows the open tab: `filtersFromQuery` reads `tab`,
and `listKnownWithFilters` lists only its statuses.

In the template, in place of the heading above the list:

```njk
<div class="govuk-tabs">
  <h2 class="govuk-tabs__title">{{ copy.tabsLabel }}</h2>
  <ul class="govuk-tabs__list">
    {% for tab in tabLinks %}
      <li class="govuk-tabs__list-item{% if tab.current %} govuk-tabs__list-item--selected{% endif %}">
        <a class="govuk-tabs__tab" href="{{ tab.href }}"{% if tab.current %} aria-current="page"{% endif %}>{{ tab.text }}</a>
      </li>
    {% endfor %}
  </ul>
  <div class="govuk-tabs__panel" id="notifications-{{ openTab }}">
    {# the list of notifications, exactly as before: only the open tab's #}
  </div>
</div>
```

No `data-module`, no `role="tablist"` and no `govuk-tabs__panel--hidden`:
these are links to other pages, not script tabs, so they must read as links
to a screen reader. Add the words to both copy files:

```js
tabsLabel: 'Notifications by status',
tabs: { all: 'All', drafts: 'Drafts', submitted: 'Submitted', amended: 'Amended' },
```

If the design only needs the groups one after another, **sections** are
simpler: each tab as its own `h2` with its count and its own list. Call
`listKnownWithFilters` once per tab (`{ tab: 'drafts' }` and so on).

Either way, add the design gap row (same words as `match-the-design` uses):

```text
| dashboard | Tabs for Drafts, Submitted and Amended | Server-side tab links styled as GOV.UK tabs, one page per tab | Script tabs need the Tabs script started in the real service (`createAll(Tabs)` in `src/client/javascripts/application.js`); the real backend also needs to list by status. | <frame> |
```

## One form for search, sort, filters and the open tab

The dashboard already has a reference search form and a sort form. With
filters, use one `method="get"` form for all of them, so applying a filter
keeps the search, the sort and the open tab, and changing the sort keeps the
filters:

```njk
<form method="get" action="{{ listAction }}" novalidate>
  <input type="hidden" name="tab" value="{{ openTab }}" />

  {{ govukInput({
    id: "referenceNumber",
    name: "referenceNumber",
    label: { text: copy.search.label, classes: "govuk-label--s" },
    value: referenceNumber
  }) }}

  {{ govukSelect({
    id: "sort",
    name: "sort",
    label: { text: copy.sort.label, classes: "govuk-label--s" },
    items: sortItems
  }) }}

  {# the status, commodity, late and date filters from step 2 #}

  {{ govukButton({ text: copy.filters.apply, classes: "govuk-button--secondary" }) }}
  <p class="govuk-body">
    <a class="govuk-link" href="{{ listAction }}?tab={{ openTab }}">{{ copy.filters.clear }}</a>
  </p>
</form>
```

Use the dashboard's own names for the search and sort fields and their copy
keys (read its template first; `referenceNumber` and `sort` are the ones the
controller reads). Then delete the old separate search and sort forms, and any
copy key only they used from both copy files, so no key is left unused.

### The release's own tabs

The default tabs are `all`, `drafts` (draft), `submitted` and `amended`
(amend). For different ones, write them once in the release's dashboard
folder, for example `features/dashboard/tabs.js`:

```js
export const TABS = Object.freeze({
  inProgress: ['draft', 'amend'],
  submitted: ['submitted']
})
```

and pass them to all three calls: `filtersFromQuery(request.query, { tabs: TABS })`,
`listKnownWithFilters(request, { …, tabs: TABS })` and
`countKnown(request, { …, tabs: TABS })`. An empty list means every status.

## Counts at a glance

`countKnown` answers:

```js
{
  total: 5,
  byStatus: { draft: 2, submitted: 2, amend: 1 },
  late: 2,
  byTab: { all: 5, drafts: 2, submitted: 2, amended: 1 }
}
```

It uses every filter in use except `status` and `tab`, so each tab and status
shows its own number whichever is open. GOV.UK has no "stat card": use a
`govukSummaryList` with `classes: "govuk-summary-list--no-border"`, a one-row
`govukTable`, or a sentence with a red `govukTag` for late (see
`layout-patterns.md`, "Glance counts at the top of a dashboard"). Log a
big-number look as a design gap.

## Examples to fill it

Filters need notifications in different states to show anything. Ask
`example-data` for them: late, submitted, amended, deleted, and one for
another organisation. Examples are made by going through the real pages, so
the counts are real.

## Check it

1. `npm run designer:check -- --set <release> --full`
2. Picture every state in one gallery. The dashboard is pictured with the
   release's example notifications in it; each `--url` is the dashboard with
   a query:

   ```bash
   npm run designer:show -- --set <release> --pages dashboard --before --url "?status=submitted" --url "?tab=drafts" --url "?tab=submitted" --url "?commodity=nothing-like-this" --url "?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026"
   ```

3. Read each picture yourself: the filtered list, each tab showing its own
   notifications (the Submitted tab must show submitted ones, not the drafts),
   the "No notifications match your filters" state, and the error state with
   its summary. `--errors` does nothing on the dashboard (its forms send with
   GET), so the last `--url` is its error state.
4. Clear filters is a plain link: the unfiltered dashboard picture is what it
   shows. Nothing here needs the designer to click.
