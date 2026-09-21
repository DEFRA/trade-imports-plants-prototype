// Vitest global setup. The engine and the L2 obligation model are
// journey-agnostic, so their tests run against a synthetic, journey-neutral
// fixture set rather than against whichever set is installed under
// `src/server/app/sets/`. See `./fixtures/index.js`.

import { installFixture } from './fixtures/index.js'

installFixture()
