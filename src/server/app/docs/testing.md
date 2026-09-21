# Testing the platform

Run commands from the repository root.

## Unit and contract tests

`npm test` builds the frontend and runs the complete Vitest suite with coverage.
`npm run test:high-risk-plants` runs only the set's own tests, without coverage.
Platform tests live beside the L1 and L2 modules they exercise; set tests live
under `src/server/app/sets/high-risk-plants/`.

Important composition and convention checks include:

- [`src/server/app/routes.test.js`](../routes.test.js)
- [`src/server/app/contract.test.js`](../contract.test.js)
- [`src/server/app/copy-convention.test.js`](../copy-convention.test.js)
- [`src/server/app/copy-parity.test.js`](../copy-parity.test.js)
- [`src/server/app/indexed.test.js`](../indexed.test.js)
- [`src/server/app/store-ops.test.js`](../store-ops.test.js)
- [`src/server/app/obligation-purity.test.js`](../obligation-purity.test.js)
- [`src/server/app/one-load-per-request.test.js`](../one-load-per-request.test.js)

The contract test is the table that pins each collecting controller to
committing exactly the obligations its `meta.collects` declares. That table is
manual: a controller absent from it does not make the test fail, so every new
collecting page adds its own case even when the suite is green. The recipes
under [the set docs](../sets/high-risk-plants/docs/README.md#recipes) each name
the case they need.

Tests may compose a real set with platform code. Production imports remain subject
to the layer rules.

## Architecture and formatting

`npm run lint` runs JavaScript, stylesheet and architecture linting. Dependency
Cruiser scans `src/server/app` and enforces the L1–L4 rules in
[`.dependency-cruiser.cjs`](../../../../.dependency-cruiser.cjs).

`npm run format` writes Prettier formatting. `npm run format:check` verifies it.

## Browser-test projects

Playwright has two projects in
[`playwright.config.js`](../../../../playwright.config.js). Both are frontend
integration tests ("fit") — the real frontend server and browser, but every
external integration (backend, auth) is stubbed, so no real deployed service
is involved:

- `journeys` runs repository-level journeys from `fit/`
- `features` runs co-located journey feature specs from
  `src/server/app/sets/high-risk-plants/journeys/linear/features/`

Both projects match nothing today. `fit/` holds only its `sign-in.js` helper and
the set owns no features, so `npm run test:fit` passes vacuously. Treat a green
Playwright run as no evidence until the first spec lands.

The platform index does not define set-specific test cases. See the
[high-risk-plants testing guide](../sets/high-risk-plants/docs/testing.md) for
fixtures, feature specs and accessibility expectations.

## Cross-repository coverage

Contracts that cross frontend and backend repositories are described in
[Cross-repository test ownership](test-ownership.md).
