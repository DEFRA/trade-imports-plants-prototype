import path from 'node:path'

import baseConfig from './webpack.config.js'
import { findReleaseAssets } from './scripts/release-assets/releases.js'
import { withReleaseAssets } from './scripts/release-assets/with-release-assets.js'

export default withReleaseAssets(
  baseConfig,
  findReleaseAssets(path.join(import.meta.dirname, 'src/server/app/sets'))
)
