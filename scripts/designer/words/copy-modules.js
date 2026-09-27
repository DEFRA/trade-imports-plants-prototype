import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { leaves } from '../../../src/server/app/shared/copy-leaves.js'
import { valueAt } from './leaf-text.js'
import { locateKeyLine } from './locate.js'
import { SHARED_DIR, setDir, toRepoPath, walkFiles } from './repo.js'

export const SECTION_CAPTIONS = 'section-captions'
export const SHARED_CHROME = 'shared chrome'

const isCopyObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const isEnglishCopyFile = (file) =>
  path.basename(file) === 'copy.en.js' &&
  path.basename(path.dirname(file)) === 'copy'

/**
 * The feature a copy file belongs to: the folder under `features/`, or
 * 'section-captions' for the captions beside the flow, or else the folder
 * that holds the `copy/` folder.
 */
export const featureOfCopyFile = (repoPath) => {
  const segments = repoPath.split('/')
  const featuresAt = segments.indexOf('features')
  if (featuresAt !== -1 && segments[featuresAt + 1]) {
    return segments[featuresAt + 1]
  }
  if (segments.includes(SECTION_CAPTIONS)) {
    return SECTION_CAPTIONS
  }
  const copyAt = segments.lastIndexOf('copy')
  return copyAt > 0 ? segments[copyAt - 1] : segments.at(-2)
}

/**
 * Every English copy file in a set, paired with its Welsh file, as
 * `{ setId, feature, shared, enFile, cyFile }` with absolute paths. The Welsh
 * path is given even when the file does not exist yet.
 */
export const setCopyFiles = (root, setId) =>
  walkFiles(setDir(root, setId))
    .filter(isEnglishCopyFile)
    .sort()
    .map((enFile) => ({
      setId,
      feature: featureOfCopyFile(toRepoPath(root, enFile)),
      shared: false,
      enFile,
      cyFile: path.join(path.dirname(enFile), 'copy.cy.js')
    }))

/** The copy every set shares: the layout, error pages, save buttons. */
export const sharedCopyFile = (root) => {
  const enFile = path.join(root, SHARED_DIR, 'copy.en.js')
  if (!existsSync(enFile)) {
    return []
  }
  const cyFile = path.join(root, SHARED_DIR, 'copy.cy.js')
  return [{ setId: null, feature: SHARED_CHROME, shared: true, enFile, cyFile }]
}

const importModule = async (file) =>
  existsSync(file) ? import(pathToFileURL(file).href) : {}

const readSource = (file) =>
  existsSync(file) ? readFileSync(file, 'utf8') : ''

const leafKeyPath = (exportName, leafPath) =>
  exportName === 'copy' ? leafPath : `${exportName}.${leafPath}`

/**
 * Every leaf of one English/Welsh copy pair, with where it is written.
 *
 * A module can export more than one copy object (the shared module exports
 * `copy` and `validatorDefaults`). Leaves of `copy` keep their plain key path;
 * leaves of any other export are prefixed with the export's name.
 *
 * @returns {Promise<object[]>} one entry per English leaf.
 */
export const loadLeaves = async (root, copyFile) => {
  const [enModule, cyModule] = await Promise.all([
    importModule(copyFile.enFile),
    importModule(copyFile.cyFile)
  ])
  const enSource = readSource(copyFile.enFile)
  const cySource = readSource(copyFile.cyFile)
  const cyExists = existsSync(copyFile.cyFile)
  const where = {
    setId: copyFile.setId,
    feature: copyFile.feature,
    shared: copyFile.shared,
    file: toRepoPath(root, copyFile.enFile),
    cyFile: toRepoPath(root, copyFile.cyFile)
  }
  return Object.entries(enModule)
    .filter(([, value]) => isCopyObject(value))
    .flatMap(([exportName, enObject]) =>
      leaves(enObject).map(({ path: leafPath, value }) => ({
        ...where,
        keyPath: leafKeyPath(exportName, leafPath),
        en: value,
        cy: valueAt(cyModule[exportName], leafPath),
        line: locateKeyLine(enSource, exportName, leafPath),
        cyLine: cyExists ? locateKeyLine(cySource, exportName, leafPath) : 0
      }))
    )
}
