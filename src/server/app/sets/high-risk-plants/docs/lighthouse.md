# Lighthouse

Lighthouse CI audits the frontend's own pages. The source of truth is
[`lighthouserc.cjs`](../../../../../../lighthouserc.cjs) at the repository root,
plus the scripts under `scripts/lighthouse/`.

## What the run audits today

Both modules the run imports now exist, so `npm run lighthouse` no longer fails
at import:

- `scripts/lighthouse/audit-targets.js` (with `audit-targets.test.js`) derives
  the URL list from the app's own registered routes and holds the `SKIPPED`,
  `FILLED_BY` and `QUERY` reasons. `QUERY` is empty. `SKIPPED` holds one entry:
  confirmation, because the page renders only on a submitted notification and
  no seed shape completes the journey far enough to submit one. `FILLED_BY`
  holds two entries: arrival-status and consignors/select, both on the
  `plantsForPlanting` shape, because those questions are out of scope on the
  ware-potato default.
- `scripts/lighthouse/seed-notification.js` holds one `SEED_SHAPES` entry per
  blueprint use case — ware potatoes, ware potatoes notified late, seed
  potatoes, plants for planting, and wood — and fills a notification by walking
  the journey's own pages. Every shape answers `commodity-type` with the type
  its use case is for.

The dashboard at `/` is the first audited route, so the derived URL list is no
longer empty. Each further page increment adds its own URL, its own step to the
seed shapes whose use case reaches that page, and its own entry in `SKIPPED`,
`FILLED_BY` or `QUERY` where the page needs one.

A seed step is not only there to reach the pages below it. The re-fetch below
runs in a session that never created the notification, so the entry guard
(`journeys/linear/flow/entry-guard.js`) admits it only on a committed user
answer. A shape with no step would bounce every guarded URL, the hub included,
to `commodity-type`.

The five shapes are held in `seed-notification.js` for now. They move to
`journeys/linear/flow/fixtures/happy-path.json` once that fixture lands, so the
Lighthouse seed, the flow fixture and the tests-repo journey specs share one set
of use cases.

## What the run does, once it works

`npm run lighthouse` is `run-s lighthouse:targets lighthouse:run`.

`lighthouse:targets` (`seed-audit-targets.js`) signs in through
`tests/lighthouse/auth-setup.cjs`, seeds one notification per shape in
`SEED_SHAPES`, derives the audit URLs from the app's own registered routes and
writes them to `.lighthouse/targets.json`. It then re-fetches every URL in a
session that has **not** walked the journey — the same standing Lighthouse
itself has — and fails when a URL does not return 200 for its own page. A page
whose prerequisites are unmet redirects to the hub, and a redirected URL would
silently audit the hub instead.

`lighthouse:run` (`run-audit.js`) clears the previous run's reports, runs
`lhci autorun`, then renames each report from the LHCI filename pattern to the
page's own stable name from the targets file.

The config:

- collects the URLs from `.lighthouse/targets.json`, defaulting to
  `http://localhost:3003` (override with `LIGHTHOUSE_BASE_URL`)
- runs each URL once
- uses the desktop preset
- starts Chromium with `--no-sandbox` and `--disable-gpu`
- runs `tests/lighthouse/auth-setup.cjs` before each audit
- writes HTML and JSON output to `lighthouse-report/`

Never run `lhci autorun` on its own. The LHCI filename pattern only has to be
unique per URL; the stable per-page names are applied afterwards by
`lighthouse:run`.

## Passing scores

The run fails below these category scores:

| Category       | Minimum |
| -------------- | ------- |
| Performance    | 0.60    |
| Accessibility  | 0.70    |
| Best practices | 0.70    |

There is no SEO assertion, and none should be added.

Treat the limits as a floor, not a target. A score above the floor can still
contain a simple finding that should be fixed.

## Add or change a page

The URL list is derived, not hand-maintained, so a new page joins the audit by
being a registered route the seeding step can reach. For a page that should be
audited:

1. Add a step to every seed shape that has to fill enough of the notification
   for the page's prerequisites to pass.
2. Check the page's stable report name. `reportName` derives it from the route;
   `reportNames` refuses two routes that would claim the same name. A page
   audited on a shape other than the default needs a `FILLED_BY` entry naming
   that shape; a page that should not be audited at all needs a `SKIPPED` entry
   with a reason. A page that sits after `origin` in the flow must be audited on
   a shape whose `SEED_SHAPES` entry carries an `originStep` with a country that
   shape's own categories admit, because `countryOfOrigin` is enforced at
   Continue and the page gate derives from it.
3. Make sure the auth script can reach it after sign-in.
4. Run Lighthouse and open that page's HTML report.
5. Check all three asserted categories.

Do not lower a score to make a change pass without agreement. Record why a URL
is excluded. An excluded URL no longer has a Lighthouse check.

## Read the output

Each report is renamed to the page's stable name:

```text
lighthouse-report/<name>.report.<extension>
```

`scripts/lighthouse/flag-simple-findings.cjs` reads the manifest and the
representative JSON reports. It records weighted numeric or binary audits with a
score below 1 for the three asserted categories. The output is:

```text
lighthouse-report/flagged-audits.json
```

SEO findings are not included in that file.

## CI ownership

This repository has its own `.github/workflows/lighthouse.yml`. It runs after a
successful branch image publish, or by manual dispatch: it checks out the
workspace, starts the stack for the chosen branch, installs the frontend, runs
`npm run lighthouse`, always tears the stack down, uploads the report for 14
days, publishes it to GitHub Pages and passes the result, report URL and
flagged findings to the workspace status action.

The set registers the dashboard, so `lighthouse:targets` now derives one URL and
seeds the notifications behind it. The check is expected to pass, and a red
result is a real failure to investigate from the uploaded report. It is not a
reason to lower a floor, stub a URL list or gate the workflow behind manual
dispatch.

Once pages are registered, when a Lighthouse change fails in CI, use the
uploaded report for that branch. Reproduce it against the same route and
stack before changing code or limits.
