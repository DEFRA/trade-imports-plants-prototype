# Platform services

Services implement IO and reference-data access below the engine. The engine never
imports them directly; L1 injects adapters into engine ports.

## Run mode

`isStubMode()` in
[`src/server/common/services/mode.js`](../../common/services/mode.js) selects stub
or real. Service barrels ask it directly where both implementations exist.

It is one service-wide switch, `STUB_MODE`, which also decides how a trader signs
in — a stub run serves stub data and signs its own session, a real run uses the
real services and Defra ID. The module reads the switch through config and refuses
it in production.

## Reference services

Platform services are:

- [`countries`](../services/countries/index.js)
- [`ports`](../services/ports/index.js)
- [`address-book`](../services/address-book/index.js)

Countries and ports expose `prime()` operations. `routes.js` primes them when the
application runs in real mode, before Hapi routes are registered.

The reason-for-import/purpose service and the transport and transporter services
were removed because the high-risk-plants journey asks no such question:
behaviour `import-reason-purpose-service-unused` records that no plants source
asks a reason-for-import or purpose, and behaviour
`customs-no-sps-hold-or-matching` records that the journey collects no transport
or port-of-exit details. Do not restore them without a behaviour that needs them.

There is no document-upload service. The plants alpha persists obligations and
fulfilments only: no uploads, no outbox, no event publishing and no PIMS routing.
A page that needs an uploaded file is out of scope until that decision changes.

## Persistence adapters

[`src/server/app/services/persistence/`](../services/persistence/) implements the
records and session contracts. L1 passes the selected adapters to
`configureRecords()` and `configureSession()`.

The records adapter owns canonical storage and the backend notification projection.
The session adapter owns known journey ids, opening-run state and flow-only answers.
See [Persistence](persistence.md).

## Set-owned services

Reference data that only makes sense for one obligation set belongs to that set.
The high-risk-plants commodities service is documented in the
[high-risk-plants services guide](../sets/high-risk-plants/docs/services.md).
