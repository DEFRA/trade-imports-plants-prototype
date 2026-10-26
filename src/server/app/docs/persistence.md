# Persistence

The engine depends on two abstract ports. Implementations live under services and
are injected at boot.

## Records port

[`src/server/app/engine/persistence/records.js`](../engine/persistence/records.js)
defines lifecycle constants and delegates these operations to a configured adapter:

- create, load, list and has
- replace fulfilment
- finalise, amend and cancel amend
- copy and soft delete
- clear for test support

[`src/server/app/services/persistence/records/index.js`](../services/persistence/records/index.js)
selects the stub or real implementation. Both expose the same operation names.

Canonical fulfilment is the durable answer source. Writes replace a whole evaluated
and purged snapshot. Reads rebuild projected answers, scope and status, so derived
state is not stored.

The evaluator works with fulfilments as a map keyed by UUID. The
[fulfilment codec](../services/persistence/records/fulfilment-codec/index.js)
stores them as an array instead, so obligation and fulfilment ids are ordinary
fields; the stored record names the runtime `fulfilmentIndex` as
`fulfilmentId`, which the backend contract keeps.

The real adapter's integration suite is skipped by default. Run it against a
running plants backend with
`PERSISTENCE_IT_MODE=real npm test -- real.integration`.

## Session port

[`src/server/app/engine/persistence/session.js`](../engine/persistence/session.js)
delegates known journey ids, opening-run state and flow-only answers. It also holds
the configured cookie names used by `registerJourneyCookie()`.

The high-risk-plants journey supplies these names in its
[`config.js`](../sets/high-risk-plants/journeys/linear/config.js):

```js
{
  knownJourneys: 'highRiskPlantsKnownJourneys',
  openingRun: 'highRiskPlantsOpeningRun',
  flowOnlyAnswers: 'highRiskPlantsFlowOnlyAnswers'
}
```

Session state is keyed by journey id. It does not replace the canonical record.

In stub mode each journey cookie is its own cookie, scoped to the set's mount,
so one set's dashboard never sees another set's drafts. In real mode the same
values are keys in the one server-wide session cookie, and each set's distinct
cookie names keep them apart.

## Lifecycle and request memoisation

[`src/server/app/engine/journey.js`](../engine/journey.js) connects a request to one
journey record. It memoises loads on `request.app`, tracks known journey ids and
implements create, amend, cancel-amend, copy and soft-delete orchestration.

Viewing and amending a notification load it from the records port and add it to
the session's known journey ids, so a notification submitted in an earlier
browser session can be amended from the dashboard. Cancel-amend, copy and
soft-delete act only on known journey ids.

A save replaces the memo with the result it returns, so the next save in the
same request sends the concurrency token the backend returned.

[`src/server/app/engine/read.js`](../engine/read.js) separately memoises the assembled
request view so controllers in one request do not repeat evaluation or IO.

## Notification projection

The real records adapter writes canonical fulfilment first, then derives the
backend notification projection through
[`src/server/app/services/persistence/records/notification-mapper/`](../services/persistence/records/notification-mapper/).
The projection is a downstream view, not a resume source.

This repository ships one mapper, Mapper A. There is no Mapper B and no outbox:
the plants alpha persists obligations and fulfilments, and publishes no GBN-AG
event and no PIMS routing. A new obligation always needs a feature binding; it
only gets a mapper field when the backend notification schema has a real home
for it.

## Boot wiring

Each set's gateway — today
[`routes-high-risk-plants.js`](../routes-high-risk-plants.js), which
[`routes.js`](../routes.js) re-exports — passes the mode-selected records and
session adapters to `configureRecords()` and `configureSession()` under its own
set id, then registers the configured journey cookie names before adding routes.
