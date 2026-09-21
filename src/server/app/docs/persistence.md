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

## Lifecycle and request memoisation

[`src/server/app/engine/journey.js`](../engine/journey.js) connects a request to one
journey record. It memoises loads on `request.app`, tracks known journey ids and
implements create, amend, cancel-amend, copy and soft-delete orchestration.

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

[`src/server/app/routes.js`](../routes.js) passes the mode-selected records and
session adapters to `configureRecords()` and `configureSession()`, then registers the
configured journey cookie names before adding routes.
