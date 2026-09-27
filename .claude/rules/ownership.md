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

# Stop: this file belongs to the real plants service

The file you are about to change is a copy of a file in the real plants
service (plants-frontend). Every Monday the weekly update merges the real
team's changes into it. A change made here clashes with theirs and lands on a
person as a `needs-person` pull request.

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

Exceptions: on a `handoff/*` or `maintain/*` branch you may edit these files,
because that work is meant for the real service or for the prototype's
maintainer.

Never change `overrides.json` to make a file "yours" so you can edit it. That
hides the clash rather than avoiding it.
