# Testing the high-risk-plants set and journey

## Set-focused Vitest run

`npm run test:high-risk-plants` runs Vitest under
`src/server/app/sets/high-risk-plants` without coverage. It covers obligation-set
tests, controllers, copy, bindings, flow policy and journey behaviour.

It does not run L1 or L2 tests. Run `npm test` for route composition, dispatch,
fulfilment-registry, copy-convention, copy-parity and controller contract
checks.

The set currently owns no test files, so `npm run test:high-risk-plants` matches
nothing. A green run is not evidence until the first test lands.

## Feature browser tests

`PORT=3053 npm run test:fit:features` builds the frontend and runs co-located
`*.fit.spec.js` (frontend integration test — see
[Browser-test projects](../../../docs/testing.md#browser-test-projects))
files under
`src/server/app/sets/high-risk-plants/journeys/linear/features`.

The Playwright default port is 3003, which is also the port the workspace stack
serves this frontend on. Pass `PORT=3053` when the stack is up. The
`webServer` block starts the app itself with `STUB_MODE=true`, so the suite is
self-contained: stub data, a locally signed session, no Defra ID exchange and no
other service running.

Each feature test starts its own notification. Use Playwright role, label and
visible-copy locators, locator assertions and auto-waiting. Do not use sleeps
and do not build a page-object layer.

Every changed page needs happy-path and validation coverage. Axe checks cover
the initial page and its validation-error state, failing on serious or critical
WCAG 2 A or AA violations.

## Whole-journey browser tests

`npm run test:fit:journeys` runs the `journeys` Playwright project under `fit/`,
matching `**/journey-smoke.fit.spec.js`.

`fit/journey-smoke.fit.spec.js` walks the five mural use cases from dashboard
to confirmation using `journeys/linear/flow/fixtures/happy-path.json`. Each
case creates its own notification and checks its reference, late-banner state
and confirmation accessibility. Lighthouse uses the same seed shapes. Arrival
dates are relative to the run date so the late and on-time cases stay stable.
Run `PORT=3053 npm run test:fit:journeys` when the workspace stack is up.

## Deployed end-to-end tests

Multi-service E2E coverage does not live here. It belongs in
`trade-imports-animals-tests` as a fourth Playwright project alongside `e2e`,
`admin` and `ins`, run against the workspace stack. See
[Cross-repo test ownership](../../../docs/test-ownership.md), which also records
that this repository has no delegating `e2e-tests.yml` workflow yet.

## Required checks for a journey change

```bash
npm run test:high-risk-plants
npm test
PORT=3053 npm run test:fit:features
npm run lint
```

Run `npm run test:fit:journeys` when the change affects the complete journey or
shared FIT helpers.

Green means every command exits with code 0, Vitest reports no failed tests,
Playwright reports no failed specs, and lint reports no errors. While a suite
still matches no files, say so rather than reporting it as passing coverage.
