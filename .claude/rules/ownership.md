---
paths:
  - 'src/server/app/sets/high-risk-plants/**'
  - 'src/server/app/routes-high-risk-plants.js'
  - 'src/server/app/routes.js'
  - 'src/server/app/engine/**'
  - 'src/server/app/model/**'
  - 'src/server/app/bridge/**'
  - 'src/server/app/flow/**'
  - 'src/server/app/shared/**'
  - 'src/server/app/services/**'
  - 'src/server/app/lib/**'
  - 'src/client/**'
  - 'webpack.config.js'
  - 'vitest.config.js'
  - 'fit/**'
---

# Stop: this file belongs to the real plants service, unless it is a prototype-owned service

The file you are about to change is almost always a copy of a file in the
real plants service (plants-frontend). Every Monday the weekly update merges
the real team's changes into it. A change made here clashes with theirs and
lands on a person as a `needs-person` pull request.

The one exception is a **prototype-owned service folder**: a folder under
`src/server/app/services/` that `overrides.json` lists on its own line in
`ours`, as `src/server/app/services/<name>/**` (today `transporters`,
`templates`, `ins-address-book` and `notification-search`). On a `design/*`
branch you may make or change one, but only by following
`.claude/skills/fake-a-service/SKILL.md`. `designer:where` answers "Yours"
for its files. Every other folder under `src/server/app/services/` (such as
`address-book`, `countries`, `ports`, `persistence` and `set-context`)
belongs to the real service, and the rules below apply to it in full.

Before any edit:

1. Run `npm run designer:where -- <the file>` and read the answer out to the
   designer.
2. If it says "Belongs to the real service", do not edit the file. Offer the
   two safe routes:
   - **Do it in your design release** (the default). Make the same change in
     the matching file under `src/server/app/sets/<release>/`. If the designer
     has no release yet, use the `design-release` skill to start one.
   - **Prepare it for the real team.** Use the `hand-off` skill. It works on a
     `handoff/<name>` branch and produces a brief and a patch for the
     plants-frontend team.
3. If it says "Shared with the real service and changed on purpose here",
   the file is named in `overrides.json` under `patched`. Keep the change as
   small as possible and update its `why` in `overrides.json`.
4. If it says "Removed by the weekly update", never edit it.

Exceptions:

- On a `handoff/*` or `maintain/*` branch you may edit these files, because
  that work is meant for the real service or for the prototype's maintainer.
- On a `design/*` branch you may edit a prototype-owned service folder
  (above) through `fake-a-service`, and nothing else in
  `src/server/app/services/`.

Never change `overrides.json` to make a file "yours" so you can edit it. That
hides the clash rather than avoiding it. A new prototype-owned service gets
its `ours` line only from `npm run designer:service -- new <name>`, which
refuses a name the real service already uses.
