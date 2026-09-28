# Layout patterns that work here

Each pattern names a template that already does it. Copy from that file in
your release (the same path with your release id in place of
`high-risk-plants`).

## A question page (two-thirds width)

The default. Every journey page renders inside a two-thirds column, so lines
stay short enough to read.

Copy from: `journeys/linear/features/commodity-type/template.njk`.

```njk
{% block journeyContent %}
  {% include "shared/error-summary.njk" %}

  {{ sectionCaption(caption) }}
  <form method="post" novalidate>
    <input type="hidden" name="crumb" value="{{ crumb }}" />
    <input type="hidden" name="concurrencyToken" value="{{ concurrencyToken }}" />

    {{ govukRadios({ ..., fieldset: { legend: { text: copy.legend, isPageHeading: true, classes: "govuk-fieldset__legend--l" } } }) }}

    {{ saveActions(hubHref, copy = sharedCopy.saveActions) }}
  </form>
{% endblock %}
```

When the page asks one question, the question is the page heading: set
`isPageHeading: true` on the legend or label and leave out the separate `h1`.

## A full-width page

For tables, lists of records and check your answers. The controller asks for
it with `contentColumnClass: kit.surfaceClass('display')`.

Copy from: `journeys/linear/features/check-answers/controller.js` (the
setting) and `journeys/linear/features/commodities/list/list.njk` (a table).

## Two columns: a narrow panel beside the main content

Copy from: `journeys/linear/features/dashboard/template.njk`, which puts a
search form in a one-third column beside the results.

```njk
<div class="govuk-grid-row">
  <div class="govuk-grid-column-one-third">
    <h2 class="govuk-heading-m">{{ copy.search.heading }}</h2>
    ...
  </div>
  <div class="govuk-grid-column-two-thirds">
    ...
  </div>
</div>
```

The page itself must be full width first, or the two columns squeeze into
two-thirds of the screen.

## Records shown as cards

Each record as a summary card: a title, key and value rows, and actions in the
card header.

Copy from: `journeys/linear/features/dashboard/template.njk`
(`govukSummaryList` with `card: { title: ..., actions: ... }`).

Use cards when each record has several facts and its own actions. Use a table
(`govukTable`) when people compare the same few facts across many records.

## A task list (the overview page)

Copy from: `journeys/linear/features/hub/template.njk`. One `h2` and one
`govukTaskList` per group. The rows, their order and their statuses come from
the hub's `controller.js` and the flow, so changing which tasks show or their
order is a journey change (`change-the-journey`). Changing headings, spacing
and the button below the list is a template change.

## Check your answers

Copy from: `journeys/linear/features/check-answers/template.njk`. Summary
cards, one per section, each with Change links. Row order and labels come from
the controller: use `change-the-journey` for those.

## A confirmation page

Copy from: `journeys/linear/features/confirmation/template.njk`. A
`govukPanel` with the reference, then paragraphs, then links. A "What happens
next" section is an `h2 class="govuk-heading-m"` and paragraphs under the
panel.

## A filter panel beside a list

MoJ's filter layout is installed but its styles are not loaded, so it renders
as plain HTML. Build it with GOV.UK pieces instead:

- a full-width page with a one-third and two-thirds grid row (as above)
- in the one-third column, a `<form method="get">` holding small
  `govukCheckboxes` (`classes: "govuk-checkboxes--small"`) or a `govukSelect`,
  and a secondary `govukButton` labelled "Apply filters"
- in the two-thirds column, the results

The dashboard's search and sort forms work this way already. Reading the
filter from the address bar is a controller change: `fake-a-service` has the
recipe (`dashboard-filters-and-tabs.md`). Log the missing MoJ look as a design
gap.

## Tabs on a dashboard

**Never use the `govukTabs` macro in a release.** Its script is not started in
this service, but the macro still marks every panel after the first
`govuk-tabs__panel--hidden`, and the GOV.UK styles hide them. Only the first
tab's content ever shows and the other tabs cannot be opened, yet a picture
looks like working tabs. Options, best first:

1. Server-side tab links: the GOV.UK tabs classes on real links
   (`?tab=drafts`), with only the open tab's list rendered. It looks like
   GOV.UK tabs with no script. The markup, and the controller change it needs,
   are in `fake-a-service`'s `references/dashboard-filters-and-tabs.md`,
   "Step 3: tabs". Counts go in the link text, for example "Drafts (3)".
2. One list, filtered by a status select or radios in a GET form (see "A
   filter panel beside a list").
3. Sections one after another, each with an `h2` that carries its count.

In every case, add a design gap row: "Script tabs need the Tabs script started
in the real service (`createAll(Tabs)` in
`src/client/javascripts/application.js`)". Picture each tab with
`designer:show --url "?tab=<id>"` and read each picture: each tab must show
its own content.

## Glance counts at the top of a dashboard

GOV.UK has no "stat card". Use one of:

- a short `govukSummaryList` without borders
  (`classes: "govuk-summary-list--no-border"`): the key is the status, the
  value is the count
- a `govukTable` with one row of counts
- a line of text with tags: "3 drafts, 1 late" with the "late" in a red
  `govukTag`

Log the big-number look as a design gap.

## Things you cannot lay out here

- anything that sticks to the screen while you scroll
- pop-up dialogs (modals). Use a separate confirm page instead, as
  `delete-notification` does
- drag and drop
- a layout wider than the GOV.UK page width (1020px)

Build the nearest pattern above and log each one in `design-gaps.md`.
