# trade-imports-plants-frontend

[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-plants-frontend&metric=security_rating)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-plants-frontend)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-plants-frontend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-plants-frontend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_trade-imports-plants-frontend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_trade-imports-plants-frontend)

The frontend for the high-risk plants import notification journey. It runs on
the same obligation and journey platform as the live-animals frontend: a
journey-agnostic engine under `src/server/app/`, with all journey content in
the `high-risk-plants` set beneath it. The set provides the notification
journey from commodity selection through declaration and confirmation.

- [Platform documentation](src/server/app/docs/README.md)
- [High-risk-plants set and journey documentation](src/server/app/sets/high-risk-plants/docs/README.md)

Run the set's unit suite from the repo root: `npm run test:high-risk-plants`.

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
- [Lighthouse](#lighthouse)
- [SonarCloud](#sonarcloud)
- [Licence](#licence)

## Requirements

### Node.js

Node 24 or later, and npm 11.6.2 — the version pinned by `packageManager` in
`package.json`. An ambient npm older than that rejects the lockfile.

To use the correct version of Node.js for this application, via nvm:

```bash
cd trade-imports-plants-frontend
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

### Development

To run the application in `development` mode:

```bash
npm run dev
```

It serves on port 3003.

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
npm run fit:start:workspace     # the workspace-backed start, see below
```

`npm run fit:start:workspace` is `fit:start` with
[scripts/check-workspace-stack.js](./scripts/check-workspace-stack.js) chained
ahead of it, so a run against the workspace stack refuses to start when the
stack is down instead of failing later with confusing errors. Plain
`npm run fit:start` — the one the Playwright web server uses — stays
stub-backed and needs no stack.

`npm run lint:arch` runs Dependency Cruiser over `src/server/app` and enforces
the L1–L4 layer rules in `.dependency-cruiser.cjs`. Production code cannot use
test exemptions.

## AUTHENTICATION (trade-imports-defra-id-stub)

For local cross-service development the recommended path is the workspace docker
stack at <https://github.com/DEFRA/trade-imports-workspace> — it stands the stub
up alongside the frontend with the right env wiring; no `/etc/hosts` edits
required.

If running this service standalone against the stub on `localhost:3007`, create
an env file:

```
DEFRA_ID_OIDC_CONFIGURATION_URL=http://localhost:3007/idphub/b2c/b2c_1a_cui_cpdev_signupsigninsfi/.well-known/openid-configuration
DEFRA_ID_CLIENT_ID=8c5e0bd-8223-4908-a5aa-c9c1d7cddaac
DEFRA_ID_CLIENT_SECRET=test_value
DEFRA_ID_SERVICE_ID=aeaa0a80-15f3-48b2-8bd7-0e02874b3d32
DEFRA_ID_POLICY=b2c_1a_cui_cpdev_signupsigninsfi
```

Alternatively set `STUB_MODE=true`, which serves stub data and signs its own
session instead of doing the Defra ID OIDC exchange. Auth is still enforced —
only the external round-trip is bypassed — and the switch is refused in
production. The Playwright suite sets it for its own web server, so
`npm run test:fit` needs no other service running.

## Docker

### Development image

> [!TIP]
> For Apple Silicon users, you may need to add `--platform linux/amd64` to the
> `docker run` command to ensure compatibility, for example
> `docker build --platform=linux/arm64 --no-cache --tag trade-imports-plants-frontend`

Build:

```bash
docker build --target development --no-cache --tag trade-imports-plants-frontend:development .
```

Run:

```bash
docker run -p 3003:3003 trade-imports-plants-frontend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag trade-imports-plants-frontend .
```

Run:

```bash
docker run -p 3003:3003 trade-imports-plants-frontend
```

### Local stack

This repository carries no compose file of its own. The full local environment
(MongoDB, Floci, Redis, the stubs, and every trade-imports service including
this one) is the workspace stack in
[DEFRA/trade-imports-workspace](https://github.com/DEFRA/trade-imports-workspace):

```bash
# from the workspace root
./scripts/stack/run-stack.sh              # full stack from published images
./scripts/stack/run-stack.sh -d           # built from local source under repos/
./scripts/stack/run-stack.sh -e plants-frontend  # everything except this service (run it via npm run dev)
```

A cross-repo change must use the **same branch name** in every repository it
touches: the stack probes each repository for a branch-tagged image and falls
back to `:latest` per service, so a mismatched name silently picks up someone
else's image.

## Lighthouse

`npm run lighthouse` seeds its audit targets from the app's own registered
routes, then runs Lighthouse CI against them.

The set registers journey pages, which supply the derived audit URL list. The
[Lighthouse guide](src/server/app/sets/high-risk-plants/docs/lighthouse.md)
covers what each page increment adds, the score floors and the contribution
steps.

## SonarCloud

Instructions for setting up SonarCloud are in
[sonar-project.properties](./sonar-project.properties).

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE
found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and
applications when using this information.

> Contains public sector information licensed under the Open Government license v3
