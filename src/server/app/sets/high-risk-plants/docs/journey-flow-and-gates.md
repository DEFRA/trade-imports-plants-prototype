# High-risk-plants journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/high-risk-plants/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

Those exports hold the start, commodity, commodityDetails, origin, arrival and
destination sections, the `commodities`, `origin`, `arrival` and `destination`
task rows and the opening run's six steps — everything the journey has landed so
far.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports `sections`, today holding
`start` (the dashboard), `commodity` (the commodity-type page and the
commodities list), `commodityDetails` (the collection's entry sub-page),
`origin` (the country-of-origin page), `arrival` (the arrival-status question,
then the arrival details) and `destination` (the place-of-destination page). A
flow section is a navigation sequence:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

Array order is journey order. It controls `nextInSection()` and, through the
section's place among the other sections, the strictly-earlier continue
prerequisites.

A page reached from another page rather than by continuing past one needs a
section of its own, which is why `commodityDetails` is separate. The
commodities list page's Continue leaves the commodity section; the entry
sub-page is opened from the list and sends the trader back to it. Had the two
shared a section, `nextInSection` would send that Continue into the entry page
instead. Its own section still gives it the commodity-type prerequisite every
page after the entry question carries.

Normal page gates are derived from `meta.collects`, in-scope obligations and
earlier continue prerequisites. Author a section or page `gate` only for policy
that the derived rule cannot express. The animals journey has exactly one
authored section gate — its `review` section requires
`scope.readyForCheckYourAnswers` — and this journey should expect to need about
as few.

`FLOW_ONLY_KEYS` is `[]`. Add `declaration` when the declaration page lands, and
not before: a flow-only key widens the recognised answer-key surface, and an
unrecognised key is rejected loudly by the engine write paths rather than stored
inert. Flow-only values use the session's flow-only store, not canonical
obligation fulfilment.

## Task rows

[`task-rows.js`](../journeys/linear/flow/task-rows.js) exports `taskRows`, today
holding the `commodities` row — the entry question, the list page and the entry
sub-page — the `origin` row, the `arrival` row and the `destination` row. The
commodities row spans two flow sections. A task row is a hub item and a submit-readiness unit; it is not a
flow section. Do not call the hub entry a section in code.

The arrival row holds the arrival-status question and the arrival details. The
question is out of scope for potatoes, so a potato notification opens the row on
the details page instead — every commodity type owes an arrival date. The row is
deliberately not `conditional`: no notification finds the whole of it
inapplicable.

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

Array order is journey order here too. The hub opens a row when ANY of its pages
is reachable and links it to the first of them whose gate passes
(`rowGatePasses` and `rowEntry`), so the page a notification is asked first has
to lead the row; the commodity entry sub-page is in its row because its data
belongs to that task, not because the hub ever links there.

Row status defaults to the union of each page's `collects` — that is what
`rowParts()` computes, and `rowStatus()` feeds to `statusOf()`. `parts` narrows
a row to a collection facet. `conditional: true` lets the hub hide a row that is
not applicable.

Every row contributes to `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete, so prove both the
blocked and the complete state.

The hub feature's controller places task-row ids under visible headings and
supplies their presentation order. The hub feature and its `GROUPS` array both
landed with the hub increment.

## Opening run and entry guard

[`run.js`](../journeys/linear/flow/run.js) owns the opening-run sequence. Its
`RUN_STEPS` holds six steps, commodity-type, commodities, origin,
arrival-status, arrival-details then place-of-destination: the opening run opens
on the entry question, goes on to the consignment's commodities, asks where they
come from, asks whether they have arrived, then when, and closes on where the
consignment is going. Place-of-destination is asked of every commodity type —
the `placeOfDestination` obligation carries no `applyTo` — and with no later step
after it `nextRunTarget` falls through to the hub, whose GET marks the run
complete. An unknown step id still returns `null`. The entry sub-page is not a
step — the list page sends a trader with no lines there and takes them back. The
arrival-status step is skipped for potatoes, whose notification is never asked
the question: its target is `null` while the answer is out of scope, and the run
goes straight on to arrival-details, which every commodity type answers.

The opening run should begin when the notification is created, from the
dashboard's create POST — the single caller of `beginOpeningRun`. The journey
entry page is an ordinary page otherwise, with no opening-run special case.

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) is **live**, keyed to
the entry page `commodity-type`, whose identity it imports from
[`features/commodity-type/page.js`](../journeys/linear/features/commodity-type/page.js).
`routes.js` calls `entryGuardTarget` from `server.ext('onPreHandler')` and
redirects on any target it returns. The guard:

- ignores anything outside `/notifications/<id>/`
- ignores the create path
- ignores the `amend`, `cancel-amend`, `copy` and `delete` action slugs — `copy`
  has no route yet, and the exemption is deliberately ahead of it
- ignores the entry page and its sub-paths, so there is no redirect loop
- admits a request when the opening run has begun for that journey in this
  session (`openingRunStarted`, true for both `RUN_ACTIVE` and `RUN_COMPLETE`),
  or when the journey carries committed user answers
  (`hasCommittedNotificationAnswers`)
- sends anything else — a deep link to an id this session never created and that
  holds no answers — to the entry page

`hasCommittedNotificationAnswers` counts only answers that resolve to a manifest
obligation and are not `SYSTEM_POPULATED`, so a journey holding nothing but a
flow-only key reads as fresh. The commodity-type controller imports the same
predicate to choose its Back link.

A journey the guard bounces to the entry page does not resume the opening run
when it saves that page: `kit.nextTarget` finds `inOpeningRun` false, so
`runTarget` is null and the user continues to the hub. That is the accepted rule
for a returning user without run state. Only a notification created in this
session sequences through `RUN_STEPS`.

## Registration wiring

[`src/server/app/routes.js`](../../../routes.js) imports `sections`, `taskRows`,
`rowStatus`, `nextRunTarget`, `FLOW_ONLY_KEYS`, `entryGuardTarget` and
`sectionCaptionOf` (from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)),
then passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js), along with the
journey's `LAYOUT` from [`config.js`](../journeys/linear/config.js).

Because `routes.js` injects the whole exported arrays, adding an entry to the
existing `sections` or `taskRows` needs no extra L1 registration. A new feature
still needs controller and binding registration in the journey barrels.

## Section captions

[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)
owns the map, with its own `copy.en.js`/`copy.cy.js` pair beside it, and
`sectionCaption` is passed in the `configureJourneyFlow` call in **both**
[`routes.js`](../../../routes.js) and the test fixture at
`test/fixtures/index.js`. The fixture keeps a synthetic map of its own so the
engine suite stays journey-neutral; it never imports this set.

`captionSections` is data — an array of `{ id, pages }` importing page
identities from the features — and `sectionCaptionOf(pageId)` resolves the
section's name from the copy pair. Never a string chosen page by page. Four
caption sections exist so far — the dashboard; About the consignment over the
four commodity and origin pages (commodity-type, commodities,
commodity-details, origin); Arrival over the arrival-status question and the
arrival details; and Destination over the place-of-destination page; the
module's doc comment names the rest the journey spec still expects, so a page
increment knows where to file itself.

`kit.base()` resolves the name for the page identity a controller passes it and
puts it in the view as `caption`. The page template imports the macro with
`{% from "shared/section-caption.njk" import sectionCaption %}` and calls it
immediately above the page heading. Pass the caption size that matches the
heading — `sectionCaption(caption, "govuk-caption-xl")` above a
`govuk-heading-xl` — and let nothing sit between the two: the caption carries
its own bottom margin, which collapses from the tablet breakpoint, so it only
reads as a caption when it is the element directly above the heading.

Caption sections are the ones a reader sees named above a heading. They are
finer than the hub's task-row groups and are not derived from them. A page left
out of the map renders no caption; the caption module's unit test should list
those pages explicitly, so a new page cannot be added without a decision either
way.

The generic algorithms are documented in
[Flow machinery and gates](../../../docs/flow-and-gates.md).
