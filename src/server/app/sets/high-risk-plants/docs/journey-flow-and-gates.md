# High-risk-plants journey flow and gates

The linear journey owns its topology in
[`src/server/app/sets/high-risk-plants/journeys/linear/flow/`](../journeys/linear/flow/).
The platform consumes that policy through `configureJourneyFlow()`.

Those exports hold the five sections, the seven task rows and the entry guard.

The journey has one page order: the order Overview lists its tasks in. Save and
continue goes to the next page in that order that applies, and from the last page
that applies to check your answers, however the page was reached (a new notification,
the Overview, a reopened draft, a new browser session, a check your answers
Change link or an amendment). The session holds no record of how a notification was
started. When the next page that applies needs a required earlier answer that is
missing, Save and continue goes to the page that asks for it instead. This journey's
required earlier answers are the commodity type and where the consignment is coming
from.

## Flow sections

[`flow.js`](../journeys/linear/flow/flow.js) exports `sections`, holding `start` (the
dashboard), `about-the-consignment` (the commodity-type page, the commodities list,
the commodity details sub-page and origin), `arrival-and-destination` (the
arrival-status question, the arrival details and the place of destination),
`consignment-parties` (the consignor, the identification numbers and the consignment
contact) and `review` (check your answers, the declaration and the confirmation page).
A flow section is an Overview group:

```js
{
  id: '<section-id>',
  pages: [firstPage, secondPage]
}
```

Array order is the journey's page order, and the sections are Overview's groups. The
section's place among the others gives the strictly-earlier continue prerequisites.

A page reached only from the page that opens it is a sub-page: commodity details
carries `subPage: true` on its page identity, so it keeps its section's status and
prerequisites but is no step of the journey's order. It is opened from the
commodities list and sends the trader back to it, and the list goes on to origin.
Origin follows commodity details so a line can be added before a country is named.
Arrival status and the consignor are out of scope for potatoes and so passed over.

Normal page gates are derived from `meta.collects`, in-scope obligations and
the required earlier answers. Author a section or page `gate` only for policy
that the derived rule cannot express. The animals journey has exactly one
authored section gate — its `review` section requires
`scope.readyForCheckYourAnswers` — and this journey should expect to need about
as few.

`FLOW_ONLY_KEYS` is `['declaration']`. A flow-only key widens the recognised
answer-key surface, and an unrecognised key is rejected loudly by the engine write
paths rather than stored inert. Flow-only values use the session's flow-only store,
not canonical obligation fulfilment.

## Task rows

[`task-rows.js`](../journeys/linear/flow/task-rows.js) exports seven `taskRows`, in
the order Overview lists them: `commodities` (the entry question, the list page and the
entry sub-page), `origin`, `arrival`, `destination`, `consignor` (conditional),
`identificationNumbers` and `contact`. A task row groups pages on Overview and is a
submit-readiness unit; it decides nothing about where Save and continue goes. It is not
a flow section. Do not call the hub entry a section in code.

The arrival row holds the arrival-status question and the arrival details. The
question is out of scope for potatoes, so a potato notification opens the row on
the details page instead — every commodity type owes an arrival date. The row is
deliberately not `conditional`: no notification finds the whole of it
inapplicable.

```js
{ id: '<task-row-id>', pages: [firstPage, secondPage] }
```

The hub opens a row when ANY of its pages
is reachable and links it to the first of them whose gate passes
(`rowGatePasses` and `rowEntry`), so the page a notification is asked first has
to lead the row; the commodity entry sub-page is in its row because its data
belongs to that task, not because the hub ever links there.

Save and continue goes to the next page that applies in the journey's order,
from every start: commodity type to the commodities list, the list to origin,
arrival details to the place of destination, the consignor to identification
numbers, and the contact address to check your answers. No task row changes that.

Row status defaults to the union of each page's `collects` — that is what
`rowParts()` computes, and `rowStatus()` feeds to `statusOf()`. `parts` narrows
a row to a collection facet. `conditional: true` lets the hub hide a row that is
not applicable.

Every row contributes to `readyForCheckYourAnswers`. A mandatory new row
therefore blocks Check and submit until it is complete, so prove both the
blocked and the complete state.

The hub feature's controller derives its groups from the flow sections, in
order, then appends the check-and-submit group.

## Entry guard and the Back link

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) owns the journey's redirect
policy before handlers run and the Import Notification Service's type question
(`insTypeQuestionUrl`), which the gateway passes to `configureJourneyFlow()`. Its
question is the plain What are you importing? question, because the Import Notification
Service takes no high-risk plants notification back to it.

Back on every journey page goes to the place the trader came from. The place travels
on the page's links and form posts as the trail (see
[Where Back goes](../../../docs/flow-and-gates.md#where-back-goes-the-trail)):

| The trader came from                  | Back opens                                           |
| ------------------------------------- | ---------------------------------------------------- |
| Save and continue on another page     | That page, carrying the places beneath it            |
| An Overview task row or review button | Overview                                             |
| A review Change link or error link    | The review                                           |
| A dashboard card (View or Amend)      | The dashboard                                        |
| Start a new notification              | The dashboard, from the first page                   |
| The Import Notification Service       | Its plain type question, from the first page         |
| Nothing the journey knows             | Overview (the first page: see the entry guard below) |

Following a Back link does not end anything: a later Save and continue goes on to the
next page that applies, adding the page saved to the trail, so Back steps through the
visited pages in reverse. Save and return to overview still goes to the overview. The
commodity details page opened with no line on the consignment goes Back where the
commodities list would go. Changing the commodity type so that lines are removed
removes them whichever button was pressed, and opens the commodities list reporting
the removed lines with the commodity type page on the trail. Back is the same on a draft and while amending, and a page names no fixed Back
target and no list of earlier pages its Back may open.

A check your answers Change link or error-summary link carries where check your
answers' own Back link went, so Back from the page it opens returns to check your
answers with that Back link unchanged.

A round trip to a sub-page keeps where the trader came from, so the page that opened
it still goes Back where it did before: commodity details from the commodities list,
a picker's View link and a party's edit page each carry the trail out and back.

This journey has no address-book exception: no page goes Back to the Overview whatever
the trail. The live animals journey has two, after a return from the Import
Notification Service's address book.

A trail that names a place the journey does not have is ignored and logged once, and
the page goes Back to its fallback. The fallback is the overview, except on the first
page (the dashboard until an answer is entered, then the overview: `leaveJourneyLink` in
`entry-guard.js`) and on the review (the overview on a draft or an amendment, the
dashboard on a submitted notification, including the one shown after an amendment is
cancelled). A refused Continue on the review shows the same Back link.

## Back on check your answers

Check your answers' Back link goes to where the trader came from, on a draft, an
amendment and a submitted notification alike:

- the last journey page, when check your answers was reached by Save and continue
  from it
- the Overview, when it was opened from the Overview
- the dashboard, when it was opened from the dashboard

Coming back by Back from a page a check your answers Change link or error-summary link
opened, Back goes where it went before. After a refused Continue that shows check your
answers again, Back goes where it went before. After an amendment is cancelled, Back
goes to the dashboard.

Check your answers reached any other way goes Back to the Overview on a draft or an
amendment and to the dashboard on a submitted notification. The other ways are: from
the declaration; from the confirmation page; by a typed address; in a new browser
session; or by a link whose marker is missing or not allowed.

Its buttons, Continue, the declaration and the confirmation page behave as the
features guide describes them.

## Creating a notification

The dashboard's create POST and the start entry (`<set>/start`, which the Import
Notification Service's type question opens) both create a notification through one
helper in the dashboard controller, which redirects to the commodity-type page with the
dashboard or the Import Notification Service as the first place on the trail. The start
entry sits outside `/notifications/`, so the entry guard never sees it.

## The entry guard

[`entry-guard.js`](../journeys/linear/flow/entry-guard.js) is **live**, keyed to
the entry page `commodity-type`, whose identity it imports from
[`features/commodity-type/page.js`](../journeys/linear/features/commodity-type/page.js).
This set's gateway, `routes-high-risk-plants.js`, calls `entryGuardTarget` from a
sandboxed `server.ext('onPreHandler')` — re-entering its own set context around
the call — and redirects on any target it returns. The guard:

- ignores anything outside `/notifications/<id>/`
- ignores the create path
- ignores the `amend`, `cancel-amend`, `copy` and `delete` action slugs
- ignores the entry page and its sub-paths, so there is no redirect loop
- admits a request when the journey carries committed user answers
  (`hasCommittedNotificationAnswers`)
- sends anything else — a deep link to an id this session never created, or a
  draft with nothing saved, whether the request is for Overview, the review,
  the declaration or the confirmation page — to the entry page, logging the
  journey id and the requested path once

`hasCommittedNotificationAnswers` counts only answers that resolve to a manifest
obligation and are not `SYSTEM_POPULATED`, so a journey holding nothing but a
flow-only key reads as fresh. The commodity-type controller imports the same
predicate to choose its Back link.

A journey the guard bounces to the entry page goes on from there to the
commodities list like any other start. `leaveJourneyLink` in `entry-guard.js` is
Overview's link as the trader may follow it: the dashboard until an answer is
entered, once for Back and for the first page's Cancel link. The guarded prefix is
read per request, because the set's mount prefix is only known inside a request's
set context.

## Registration wiring

This set's gateway,
[`src/server/app/routes-high-risk-plants.js`](../../../routes-high-risk-plants.js)
(the [`routes.js`](../../../routes.js) barrel only re-exports it), imports
`sections`, `taskRows`, `rowStatus`, `insTypeQuestionUrl`,
`FLOW_ONLY_KEYS`, `entryGuardTarget` and `sectionCaptionOf` (from
[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)),
then passes them to
[`configureJourneyFlow()`](../../../flow/journey-flow.js), along with the
journey's `LAYOUT` from [`config.js`](../journeys/linear/config.js).

Because `routes-high-risk-plants.js` injects the whole exported arrays, adding an entry to the
existing `sections` or `taskRows` needs no extra L1 registration. A new feature
still needs controller and binding registration in the journey barrels.

## Section captions

[`flow/section-captions/index.js`](../journeys/linear/flow/section-captions/index.js)
owns the map, with its own `copy.en.js`/`copy.cy.js` pair beside it, and
`sectionCaption` is passed in the `configureJourneyFlow` call in **both**
[`routes-high-risk-plants.js`](../../../routes-high-risk-plants.js) and the test fixture at
`test/fixtures/index.js`. The fixture keeps a synthetic map of its own so the
engine suite stays journey-neutral; it never imports this set.

`captionSections` is data — an array of `{ id, pages }` importing page
identities from the features — and `sectionCaptionOf(pageId)` resolves the
section's name from the copy pair. Never a string chosen page by page. The
sections are the dashboard; About the consignment over the commodity-type,
commodities, commodity-details and origin pages; Arrival over the
arrival-status question and the arrival details; Destination over the
place-of-destination page; and consignment parties over the consignor-select
and identification-numbers pages. The overview hub, the contact page, check
your answers, declaration and confirmation carry no caption.

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
