# Cross-repo test ownership

This repository owns tests for frontend code and local journey behaviour. The
trade-imports workspace and the shared tests repository own deployed tests that
need several services running together.

There is no dual-frontend parity project in the current Playwright config.

## This frontend repository owns

- Vitest unit and contract tests under `src/`
- stub and real adapter request-shape tests
- the local stub journey smoke test in `fit/`
- feature Playwright specs under
  `src/server/app/sets/high-risk-plants/journeys/linear/features/`
- the Playwright server and project settings in `playwright.config.js`
- Lighthouse configuration and report processing

A frontend change must prove its page, model, engine and adapter behaviour here.
See [testing.md](testing.md).

Both Playwright projects are empty today: `fit/` holds only the `sign-in.js`
helper, and the set owns no feature specs yet. The first journey page has to
bring the first spec with it, or this repository proves nothing in a browser.

## The tests repository owns the deployed E2E suite

Deployed, multi-service end-to-end coverage for high-risk plants lives in
[`DEFRA/trade-imports-animals-tests`](https://github.com/DEFRA/trade-imports-animals-tests),
as a fourth Playwright project alongside the existing `e2e`, `admin` and `ins`
projects. That repository is named for the animals journey only because it
predates this one; it is the shared tests repository for the programme and is
expected to be renamed. Do not stand up a second tests repository for plants.

An E2E spec belongs there when it needs the published frontend image and the
other running trade-imports services — the backend, MongoDB, the Defra ID stub
and the upstream stubs — brought up by the workspace stack in
[`DEFRA/trade-imports-workspace`](https://github.com/DEFRA/trade-imports-workspace).
The workspace owns the stack, the reusable E2E workflow and the shared report
link.

## What is not wired yet

This repository has no `.github/workflows/e2e-tests.yml`. The animals frontend
delegates to the workspace's reusable `e2e-tests.yml`, passing its branch name
and inheriting secrets, then reports the result back to the pull request. The
plants frontend has to gain the same delegating workflow before a deployed E2E
result can appear on a plants pull request.

Until it does, `check-pull-request.yml` is the only check: unit, format, lint
and coverage. Say so plainly on a pull request rather than implying E2E ran.

Cross-repo branches must carry the **same branch name** in every affected
repository, because the workspace stack probes each repository for a
branch-tagged image and falls back to `:latest` per service. A mismatched name
silently gives you someone else's image.

## When a contract changes

Keep the quickest exact check at the boundary that defines the contract:

- a controller or view change gets a feature spec here
- a frontend-to-backend payload change gets an adapter contract test here
- the backend keeps its own request and persistence tests in
  `trade-imports-plants-backend`
- an end-to-end change across published services gets a spec in the tests
  repository

Do not rely on only the deployed suite for a frontend rule that Vitest or a
feature spec can prove. Do not copy a full cross-service setup into this
repository when the workspace runner already owns it.

For a change that affects both repositories:

1. Add or update the local frontend contract test.
2. Add or update the backend contract test in `trade-imports-plants-backend`.
3. Update or add the plants project spec in the tests repository when the
   user-visible path or service interaction changes.
4. Use matching branch names, and therefore matching branch images, across every
   repository the change touches.

The frontend pull request check remains the source for unit, format, lint and
coverage results. Once the delegating workflow exists, the E2E check becomes the
source for the deployed cross-repo result.

Keep both results visible on a change that crosses the boundary.
