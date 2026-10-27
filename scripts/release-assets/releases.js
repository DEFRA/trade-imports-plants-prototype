import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

export const RELEASE_STYLES = 'assets/styles.scss'
export const RELEASE_SCRIPTS = 'assets/scripts.js'

/** The webpack entry, and the manifest key stem, of one release's bundle. */
export const releaseEntryName = (setId) => `release-${setId}`

/**
 * Every set under `setsDir` that carries its own styles or scripts, with the
 * absolute paths of the entry files it has. A set with neither is left out.
 *
 * @param {string} setsDir - the folder holding one folder per set.
 * @returns {Array<{ id: string, styles?: string, scripts?: string }>}
 */
export const findReleaseAssets = (setsDir) =>
  readdirSync(setsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .toSorted()
    .flatMap((id) => {
      const styles = path.join(setsDir, id, RELEASE_STYLES)
      const scripts = path.join(setsDir, id, RELEASE_SCRIPTS)
      const release = {
        id,
        ...(existsSync(styles) && { styles }),
        ...(existsSync(scripts) && { scripts })
      }
      return release.styles || release.scripts ? [release] : []
    })
