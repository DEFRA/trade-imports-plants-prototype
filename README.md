# trade-imports-plants-prototype

New here? [PROTOTYPE.md](PROTOTYPE.md) is written for designers — running it, what a set is, adding one, and how syncing with the real service works.

The frontend for the high-risk plants import notification journey. It runs on
the same obligation and journey platform as the live-animals frontend: a
journey-agnostic engine under `src/server/app/`, with all journey content in
the `high-risk-plants` set beneath it. The set provides the notification
journey from commodity selection through declaration and confirmation.

- [Platform documentation](src/server/app/docs/README.md)
- [High-risk-plants set and journey documentation](src/server/app/sets/high-risk-plants/docs/README.md)

Run the set's unit suite from the repo root: `npm run test:high-risk-plants`.

## For maintainers

The prototype maintainer reviews and merges designers' pull requests and the
weekly sync pull requests.

- **Runtime.** The prototype runs on its own stubs everywhere, sign-in
  included: locally with `npm run dev`, and in CDP dev from the production
  image its own `Dockerfile` builds. `STUB_MODE`'s bypass is honoured in
  production too, by design (Sam's decision) — the deployed prototype
  signs in exactly the way a local `npm run dev` does, so it needs no
  Defra ID stub and no `DEFRA_ID_*` variables in CDP dev. Setting
  `STUB_MODE=false` restores plants-frontend's own Defra ID sign-in. The
  pull-request boot check in `.github/workflows/check-pull-request.yml`
  proves the deployed shape every time: it boots the built image in
  production mode and drives a stub sign-in through to the chooser, then
  boots it again with a password set and signs in through the password page.
- **The prototype password.** CDP puts nothing in front of a service, so
  the prototype has its own shared password, the way the GOV.UK Prototype
  Kit protects a deployed prototype. Add a CDP secret called
  `PROTOTYPE_PASSWORD` to the prototype's dev environment in the CDP portal
  and redeploy: every page but `/health` then asks for it first (the
  password page is at `/prototype-password`), and remembers it in a signed
  cookie for 30 days. Unset, the prototype is open to anyone who reaches it,
  and says so in its start-up log. Changing the secret signs everyone out.
  `/prototype-password/sign-out` forgets it in one browser. It is one shared
  password for now; the code lives in `src/server/prototype-password/`.
  Try it locally with `PROTOTYPE_PASSWORD=<anything> npm run dev`.
- **Env vars.** `src/config/config.js` is the one list, with each
  variable's `doc` saying what it is for and what it defaults to. The
  redirect URLs already default to this prototype's own port (3103), not
  plants-frontend's 3003. The header's "Address book" link is deliberately
  dead — no env var sets it — because the address book belongs to the
  Import Notification Service, which this prototype does not include.
- **One instance.** Run a single instance in CDP dev. Data lives in
  memory (`SESSION_CACHE_ENGINE=memory`, the stub stores), so a second
  instance would show a different set of examples to different visitors
  depending on which one served them.
- **Data resets.** Every merge to `main` redeploys the prototype, which
  restarts the process and empties every set back to its seeded examples
  — the same thing "Reset this prototype's data" does for one set on
  request. Nothing else clears it.
- **Freeze merges during research.** A merge mid-session would reset
  every participant's data. Ask the team not to merge anything from
  "before a demo or a research session" (PROTOTYPE.md, "Deploying and
  merging") until the session ends.
- **The demo page and the technical report.** Every pull request, and every
  push to `main`, builds a stakeholder demo page — the most important
  journeys first, each with a video, paced so it is watchable — plus the
  full Playwright report (FIT tests plus every walkthrough, with traces) at
  `tests/` underneath it. Both publish to the `gh-pages` branch together:
  `reports/pr-<n>/` for a pull request, the site root
  (`https://defra.github.io/trade-imports-plants-prototype/`) for `main`, so
  the lasting link never depends on a pull request having existed
  (`reports/main/` stays as a redirect to the root, for links made before
  the move). The pull request gets a comment leading with the demo page
  link. A nightly job (`.github/workflows/prune-reports.yml`) removes closed
  pull requests' reports, so `gh-pages` stays small; the root demo page and
  report are never pruned. Each run is also uploaded as the
  `prototype-playwright-report` Actions artifact (the demo page plus
  `tests/`), so the checks are useful even before Pages is turned on.

Two things are still pending:

- `.claude/settings.json` is still plants-frontend's copy, so it wires up
  three Sonar hook scripts `overrides.json` deletes rather than the
  designer edit guard (`scripts/designer/hooks/guard-edit.js`). Replacing
  it, and adding it to `overrides.json` `ours` in the same commit on a
  `chore/<slug>` branch, so the weekly sync stops restoring the Sonar
  hooks, is Sam's call: raise it with him before making the change.
- Once the prototype is deployed, put its address in `deployedUrl` in
  [`scripts/designer/prototype.json`](scripts/designer/prototype.json) (the
  research sheet reads it from there) and in PROTOTYPE.md, "Deploying and
  merging".
- **Turn on GitHub Pages** for this repository: Settings, Pages, "Deploy
  from a branch", `gh-pages`, `/ (root)`. The branch appears after the first
  pull request or merge publishes a report. Until Pages is on, the report
  links above resolve to nothing and the pull request comment says so, but
  nothing fails: the Actions artifact is still there.

## Current state

The high-risk-plants journey is implemented, with a notification dashboard,
a task-list hub, collecting pages and a review and submission flow. The entry
guard sends an unstarted notification to the commodity-type question. See
[The served surface today](src/server/app/sets/high-risk-plants/docs/README.md#the-served-surface-today)
for the registered routes and tasks, and
[Recipe exemplars](src/server/app/sets/high-risk-plants/docs/README.md#recipe-exemplars)
for real features to follow when extending the journey.

Deployed end-to-end tests for this service live in the shared tests repository
`trade-imports-animals-tests`, as a fourth Playwright project alongside `e2e`,
`admin` and `ins`. See
[Cross-repo test ownership](src/server/app/docs/test-ownership.md).

- [Requirements](#requirements)
- [Server-side caching](#server-side-caching)
- [Redis](#redis)
- [Proxy](#proxy)
- [Local development](#local-development)
- [Auth](#authentication-trade-imports-defra-id-stub)
- [Docker](#docker)
- [Licence](#licence)

## Requirements

### Node.js

Node 24 or later, and npm 11.6.2 or later — the floor in `engines`.

To use the correct version of Node.js for this application, via nvm:

```bash
cd trade-imports-plants-prototype
nvm use
```

## Server-side caching

We use Catbox for server-side caching. By default the service uses CatboxRedis
when deployed and CatboxMemory for local development. Override with
`SESSION_CACHE_ENGINE`, set to either `redis` or `memory`.

CatboxMemory (`memory`) is _not_ suitable for production use: the cache is not
shared between instances of the service and does not survive a restart.

## Redis

Redis is an in-memory key-value store. Every instance of a service has access to
the same Redis key-value store, similar to how services might have a database.
All frontend services are given a namespaced prefix that matches the service
name, so `my-service` has access to everything in Redis prefixed with
`my-service`.

## Proxy

We use forward-proxy, which is set up by default. To make use of it,
`import { fetch } from 'undici'`: because of the
`setGlobalDispatcher(new ProxyAgent(proxyUrl))` call, requests use the
ProxyAgent dispatcher.

If you are not using Wreck, Axios, Undici or a similar HTTP client that uses
`Request`, provide the proxy dispatcher yourself:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Git hooks

`npm install` installs the pre-commit hook — `postinstall` runs
`npm run setup:husky`. The hook runs `npm run git:pre-commit-hook`: format
check, lint and the unit suite.

### Development

To run the application in `development` mode:

```bash
npm run dev
```

It serves on port 3103.

### Production

To mimic the application running in `production` mode locally:

```bash
npm start
```

### Npm scripts

All available npm scripts are in [package.json](./package.json). To list them:

```bash
npm run
```

The ones you will use most:

```bash
npm run test:high-risk-plants   # the set's own Vitest suite, no coverage
npm test                        # the full Vitest suite with coverage
PORT=3053 npm run test:fit:features
npm run test:fit:journeys
npm run lint                    # JS, stylesheet and dependency-cruiser
npm run format
```

`npm run fit:start` — the one the Playwright web server uses — stays
stub-backed and needs no stack.

`npm run lint:arch` runs Dependency Cruiser over `src/server/app` and enforces
the L1–L4 layer rules in `.dependency-cruiser.cjs`. Production code cannot use
test exemptions.

## AUTHENTICATION (trade-imports-defra-id-stub)

This prototype is never part of the workspace docker stack (see "Local
stack" below): it runs against the Defra ID stub standalone, or with
`STUB_MODE=true` bypassing the OIDC round trip entirely (see below).

To run against a real stub on `localhost:3007`, create an env file:

```
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=8c5e0bd-8223-4908-a5aa-c9c1d7cddaac
DEFRA_ID_CLIENT_SECRET=test_value
DEFRA_ID_SERVICE_ID=aeaa0a80-15f3-48b2-8bd7-0e02874b3d32
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Alternatively set `STUB_MODE=true`, which serves stub data and signs its own
session instead of doing the Defra ID OIDC exchange. Auth is still enforced —
only the external round-trip is bypassed. Unlike plants-frontend, this
prototype honours the switch in production too, by design (Sam's decision):
`prototype-defaults.js` turns it on unless it is already set, so the deployed
prototype signs in exactly the way `npm run dev` does. Set `STUB_MODE=false`
to restore plants-frontend's own Defra ID sign-in. The Playwright suite sets
`STUB_MODE=true` for its own web server, so `npm run test:fit` needs no other
service running.

Stub sign-in lets anyone in, so the prototype adds its own shared password in
front of every page when `PROTOTYPE_PASSWORD` is set (a CDP secret on the
deployed prototype; see "For maintainers" above). It sits before sign-in, so a
visitor gives the password first and then signs in as usual.

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the
> `docker run` command to ensure compatibility, for example
> `docker build --platform=linux/arm64 --no-cache --tag trade-imports-plants-prototype`

Build:

```bash
docker build --target development --no-cache --tag trade-imports-plants-prototype:development .
```

Run:

```bash
docker run -p 3103:3103 trade-imports-plants-prototype:development
```

### Production image

Build:

```bash
docker build --no-cache --tag trade-imports-plants-prototype .
```

Run:

```bash
docker run -p 3103:3103 trade-imports-plants-prototype
```

### Local stack

This repository carries no compose file of its own, and **the workspace
stack does not run this prototype**: `./scripts/stack/run-stack.sh` in
[DEFRA/trade-imports-workspace](https://github.com/DEFRA/trade-imports-workspace)
stands up MongoDB, Floci, Redis, the stubs and the real trade-imports
services, but never this one. This prototype always runs on its own
stubs, with `npm run dev`, whether or not the stack is running.

The header's "Address book" link is deliberately dead, stack running or
not: the address book belongs to the Import Notification Service, which
this prototype does not include, and there is no setting that points the
link at a real one, local or deployed. It is never needed to see a change
made here.

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE
found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and
applications when using this information.

> Contains public sector information licensed under the Open Government license v3
