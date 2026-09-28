# Filters, tabs and counts on a release's dashboard

The dashboard lists the notifications a user's browser knows. In the real
service the backend does the listing, and it cannot filter by status, late or
arrival date yet. In a design release, the prototype-owned service
`src/server/app/services/notification-search/` does it instead, in the real
services' shape: its `index.js` picks `stub.js` (which filters the release's
own records, through the records wrapper its gateway wires) or `client.js`
(the proposed plants backend query). So the dashboard can have:

- **filters**: status, commodity, late only, arrival date from and to
- **tabs**: one list per group of statuses, for example Drafts, Submitted,
  Amended
- **counts**: how many in each status, each tab and late

It is flagged "needs a real service": the plants backend needs the same
filters on its list endpoint, and a count. `CONTRACT` in
`services/notification-search/index.js` writes that down for the hand-off.

All the changes are in the release's own dashboard feature,
`src/server/app/sets/<release>/journeys/linear/features/dashboard/`: the
`controller.js`, the `template.njk`, the `copy/` pair and, for paging,
`notification-helper.js`.

## Known gap: Commodity and Arrival in the real journey

The real list marshaller
(`src/server/app/services/persistence/records/stub/marshal/list-item.js`,
owned by plants-frontend) reads answers the plants pages never save
(`commodityLines[0].commoditySelection` and `arrivalDateAtPort`; the pages
save `commodityType` and `arrivalDate`). So the **real journey's** dashboard
shows an empty Commodity and Arrival on every row.

A design release does not have this gap: the records wrapper fills both
columns from each notification's own answers
(`src/server/prototype-support/derived-columns.js`), so the columns
show and the commodity and date filters match. The commodity shows as its
type ("Potatoes", "Plants for planting", "Wood and cut trees"), not the
species. Say so when the design wants the species, and add this design gap
row whenever a release's dashboard shows either column:

```text
| dashboard | Commodity and Arrival on every row | Filled by the prototype from each notification's answers | Needs a real service: the real list marshaller reads commodityLines and arrivalDateAtPort, which the plants pages never save, so plants-frontend shows both columns empty. | <frame> |
```

## Keep a way to amend

The Actions column holds the only Amend button (a POST, so there is no link
to it elsewhere), plus View, Resume, Cancel amendment and Delete. A design
that drops the column strands submitted notifications: nobody can amend
them. Keep an Actions column (it can be narrower, or the last column), or
make the reference link open the notification with its actions. If the
design has no actions at all, keep them anyway and log it:

```text
| dashboard | Four columns with no actions | Kept the Actions column | Amend is only reachable from the dashboard row (a POST button), so dropping the column would strand submitted notifications. The real service needs another route to amend first. | <frame> |
```

## Before you start

The release's gateway, `src/server/app/routes-<release>.js`, must wrap its
records, because the notification-search stub reads them through the
wrapper:

```js
import { records } from './services/persistence/records/index.js'
import { designerRecords } from '../prototype-support/records.js'
// …
configureRecords(SET_ID, designerRecords(SET_ID, records))
```

`npm run new:set` writes this. If the gateway says
`configureRecords(SET_ID, records)`, change it to the above. The gateway is
the release's own file; `src/server/prototype-support/` is stub plumbing that
only gateways and `stub.js` files import. A dashboard page never imports it.

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

- `filters`: pass these to `searchNotifications` and `countNotifications`
- `values`: what the user typed, to put back in the form
- `errors`: `{ dateFrom: 'invalid' }` for a date that is not real,
  `{ dateTo: 'beforeFrom' }` for a "to" date before the "from" date. The words
  go in the dashboard's copy. A date with an error is not used to filter.
- `active`: true when any filter (not the tab) is in use

## Step 1: the controller

In the release's `features/dashboard/controller.js`:

1. Import the service (six `../` reach `src/server/app/`):

   ```js
   import {
     countNotifications,
     filtersFromQuery,
     searchNotifications,
     STATUSES
   } from '../../../../../../services/notification-search/index.js'
   ```

   and remove `listKnownJourneys` from the `engine/journey.js` import (the
   linter refuses an unused import).

2. In `renderDashboard`, read the filters and use the service's search in
   place of `listKnownJourneys`:

   ```js
   const { filters, values, errors, active } = filtersFromQuery(request.query)
   const listFor = (page) =>
     searchNotifications(request, { page, sort, referenceNumber, ...filters })
   const counts = await countNotifications(request, {
     referenceNumber,
     ...filters
   })
   ```

   `searchNotifications` answers in exactly the shape `listKnownJourneys` did
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
  statuses: { draft: 'Draft', submitted: 'Submitted', amend: 'Amending' },
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

The status words are the same as the row's status tag (`journeyStrip` in
`src/server/app/shared/copy.en.js`: Draft, Submitted, Amending), so a filter
and the tag it matches never read differently.

Log the MoJ filter look as a design gap (`design-gaps.md`) if the design shows
it.

**At phone width** the filter form is about 1,000 pixels tall and sits above
the tabs and results. Put the filters inside a `govukDetails` ("Filter
notifications"), open when `filtersActive` is true so the user sees what is
applied:

```njk
{% from "govuk/components/details/macro.njk" import govukDetails %}
{% set filterForm %}
  {# the form above #}
{% endset %}
{{ govukDetails({ summaryText: copy.filters.show, html: filterForm, open: filtersActive }) }}
```

with `show: 'Filter notifications'` in the copy. It is collapsed at every
width until a filter is applied: nothing in the GOV.UK toolbox opens it on a
wide screen only. If the design wants the filters always open on a wide
screen, log that as a design gap.

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

In the controller (import `DEFAULT_TABS` and `openTabFor` from the same
`services/notification-search/index.js`), work out the open tab from the
counts, then list only that tab. This replaces step 1's `listFor` and
`counts` lines:

```js
const counts = await countNotifications(request, { referenceNumber, ...filters })
const openTab = openTabFor(values, counts)
const listFor = (page) =>
  searchNotifications(request, {
    page,
    sort,
    referenceNumber,
    ...filters,
    tab: openTab
  })
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

`openTabFor` opens the tab in the address when there is one. With none (the
filter form sends no tab, see below), it opens the first tab with a row that
passes the status filter: `all` with the default tabs. So ticking "Submitted"
while on Drafts never lands on "No notifications match your filters" while
the Submitted tab has one. `keptQuery` keeps the filters, the sort and the
search when the tab changes (it is the `buildDashboardListQueryString` from
step 1, with the tab added). For the release's own tabs, pass them as the
third argument: `openTabFor(values, counts, TABS)`.

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
`searchNotifications` once per tab (`{ tab: 'drafts' }` and so on).

Either way, add the design gap row (same words as `match-the-design` uses):

```text
| dashboard | Tabs for Drafts, Submitted and Amended | Server-side tab links styled as GOV.UK tabs, one page per tab | Script tabs need the Tabs script started in the real service (`createAll(Tabs)` in `src/client/javascripts/application.js`); the real backend also needs to list by status. | <frame> |
```

## One form for search, sort, filters and the open tab

The dashboard already has a reference search form and a sort form. With
filters, use one `method="get"` form for all of them, so applying a filter
keeps the search and the sort, and changing the sort keeps the filters. The
form sends **no tab**: a tab and a status filter combined with "and" gave a
dead end (Submitted ticked on the Drafts tab shows nothing), so applying
filters lets `openTabFor` pick the tab with matches:

```njk
<form method="get" action="{{ listAction }}" novalidate>
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
    <a class="govuk-link" href="{{ listAction }}">{{ copy.filters.clear }}</a>
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

and pass them to all four calls: `filtersFromQuery(request.query, { tabs: TABS })`,
`searchNotifications(request, { …, tabs: TABS })`,
`countNotifications(request, { …, tabs: TABS })` and
`openTabFor(values, counts, TABS)`. An empty list means every status.

## Counts at a glance

`countNotifications` answers:

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
   npm run designer:show -- --set <release> --pages dashboard --before --mobile --url "?status=submitted" --url "?tab=drafts" --url "?tab=submitted" --url "?commodity=nothing-like-this" --url "?dateFrom-day=31&dateFrom-month=2&dateFrom-year=2026"
   ```

3. Read each picture yourself: the filtered list (with `?status=submitted`
   it opens a tab that has the submitted notification), each tab showing its
   own notifications (the Submitted tab must show submitted ones, not the
   drafts), Commodity and Arrival filled on every row, the "No notifications
   match your filters" state, the error state with its summary, and the phone
   pictures with the filters folded away. `--errors` does nothing on the
   dashboard (its forms send with GET), so the last `--url` is its error
   state.
4. The empty dashboard (no notifications at all) needs a second run, because
   the first one pictures it with the examples in it:
   `npm run designer:show -- --set <release> --pages dashboard --no-examples`.
   Name both gallery paths in the report.
5. Clear filters is a plain link: the unfiltered dashboard picture is what it
   shows. Nothing here needs the designer to click.
