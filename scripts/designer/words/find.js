import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  SECTION_CAPTIONS,
  loadLeaves,
  setCopyFiles,
  sharedCopyFile
} from './copy-modules.js'
import { containsText, leafText, welshStatus } from './leaf-text.js'
import { pageMap } from './pages.js'
import {
  REAL_JOURNEY_SET,
  SHARED_DIR,
  listSets,
  setDir,
  setInfo,
  toRepoPath,
  walkFiles
} from './repo.js'
import { pinnedHits, templateHits } from './scan-sources.js'

export const SHARED_FLAG = 'shared by every set: a real-service change'
export const TEMPLATE_FLAG = 'should be copy'

/**
 * The pages one copy leaf shows on. Section captions show on every page of
 * their section; other copy shows on its own feature's pages, or is named
 * after its feature when the feature declares no page (the task list).
 */
export const pagesOfLeaf = (leaf, map) => {
  if (leaf.shared) {
    return []
  }
  if (leaf.feature === SECTION_CAPTIONS) {
    const sectionId = leaf.keyPath.split('.')[1]
    return map.captionPages.get(sectionId) ?? []
  }
  const pages = map.featurePages.get(leaf.feature) ?? []
  return pages.length > 0 ? pages.map((page) => page.id) : [leaf.feature]
}

const pagesOfFeature = (feature, map) => {
  const pages = map.featurePages.get(feature) ?? []
  return pages.length > 0 ? pages.map((page) => page.id) : [feature]
}

const leafMatches = (leaf, text) =>
  containsText(leafText(leaf.en), text) ||
  (leaf.cy !== undefined && containsText(leafText(leaf.cy), text))

/**
 * A matching leaf as the find report shows it: plain values, the pages it
 * shows on, and the flags a designer needs before changing it.
 */
export const describeLeaf = (leaf, map) => {
  const kind = typeof leaf.en === 'function' ? 'function' : 'string'
  const flags = []
  if (leaf.shared) {
    flags.push(SHARED_FLAG)
  }
  if (kind === 'function') {
    flags.push(
      `fills in ${leaf.en.length} value(s): keep every \${…} placeholder`
    )
  }
  return {
    setId: leaf.setId,
    shared: leaf.shared,
    feature: leaf.feature,
    pages: map ? pagesOfLeaf(leaf, map) : [],
    alsoOn: map
      ? (map.shownOn.get(leaf.feature) ?? []).flatMap((feature) =>
          pagesOfFeature(feature, map)
        )
      : [],
    keyPath: leaf.keyPath,
    file: leaf.file,
    line: leaf.line,
    cyFile: leaf.cyFile,
    cyLine: leaf.cyLine,
    kind,
    en: leafText(leaf.en),
    cy: leaf.cy === undefined ? null : leafText(leaf.cy),
    welsh: welshStatus(leaf.en, leaf.cy),
    flags
  }
}

const templateFilesOf = (root, setIds) => [
  ...setIds.flatMap((setId) =>
    walkFiles(setDir(root, setId))
      .filter((file) => file.endsWith('.njk'))
      .map((file) => ({ setId, shared: false, file }))
  ),
  ...walkFiles(path.join(root, SHARED_DIR))
    .filter((file) => file.endsWith('.njk'))
    .map((file) => ({ setId: null, shared: true, file }))
]

const findInTemplates = (root, setIds, text) =>
  templateFilesOf(root, setIds).flatMap(({ setId, shared, file }) =>
    templateHits(readFileSync(file, 'utf8'), text).map((hit) => ({
      setId,
      shared,
      file: toRepoPath(root, file),
      line: hit.line,
      text: hit.text,
      flags: shared ? [TEMPLATE_FLAG, SHARED_FLAG] : [TEMPLATE_FLAG]
    }))
  )

const isPinningFile = (file) =>
  file.endsWith('.test.js') || file.endsWith('.spec.js')

/**
 * The tests and specs that could pin the real journey's words: its own tests,
 * the app-wide tests beside `sets/` (copy parity, shared chrome) and the
 * Playwright specs under `fit/`.
 */
const pinningFiles = (root) => {
  const appDir = path.join(root, 'src/server/app')
  const appWide = walkFiles(appDir).filter(
    (file) =>
      isPinningFile(file) &&
      !toRepoPath(root, file).startsWith('src/server/app/sets/')
  )
  return [
    ...walkFiles(setDir(root, REAL_JOURNEY_SET)).filter(isPinningFile),
    ...appWide,
    ...walkFiles(path.join(root, 'fit')).filter((file) => file.endsWith('.js'))
  ]
}

const findPinned = (root, texts) =>
  pinningFiles(root).flatMap((file) =>
    pinnedHits(readFileSync(file, 'utf8'), texts).map((hit) => ({
      file: toRepoPath(root, file),
      line: hit.line,
      text: hit.text
    }))
  )

/** The Welsh of the real journey's matches: tests pin the Welsh too. */
const realJourneyWelsh = (copy) =>
  copy
    .filter((entry) => entry.setId === REAL_JOURNEY_SET && entry.cy)
    .map((entry) => entry.cy)

const setsInScope = (root, setId) => {
  const all = listSets(root)
  if (setId === undefined) {
    return all
  }
  if (!all.includes(setId)) {
    throw new Error(
      `There is no set called '${setId}'. The sets are: ${all.join(', ')}.`
    )
  }
  return [setId]
}

/**
 * Every place some words live: copy leaves in each set in scope and in the
 * shared chrome, words written straight into templates, and (when the real
 * journey is in scope) the tests and specs that pin them.
 *
 * @param {{ root: string, text: string, setId?: string }} options
 */
export const findWords = async ({ root, text, setId }) => {
  const setIds = setsInScope(root, setId)
  const copyFiles = [
    ...setIds.flatMap((id) => setCopyFiles(root, id)),
    ...sharedCopyFile(root)
  ]
  const maps = new Map(
    await Promise.all(setIds.map(async (id) => [id, await pageMap(root, id)]))
  )
  const leavesFound = (
    await Promise.all(copyFiles.map((copyFile) => loadLeaves(root, copyFile)))
  )
    .flat()
    .filter((leaf) => leafMatches(leaf, text))
  const copy = leavesFound.map((leaf) =>
    describeLeaf(leaf, leaf.shared ? null : maps.get(leaf.setId))
  )
  const pinned = setIds.includes(REAL_JOURNEY_SET)
    ? findPinned(root, [text, ...realJourneyWelsh(copy)])
    : []
  return {
    text,
    sets: setIds.map((id) => setInfo(root, id)),
    copy,
    templates: findInTemplates(root, setIds, text),
    pinned
  }
}
