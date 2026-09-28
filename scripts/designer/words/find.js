import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import {
  SECTION_CAPTIONS,
  loadLeaves,
  setCopyFiles,
  sharedCopyFile
} from './copy-modules.js'
import { containsText, leafText, welshStatus } from './leaf-text.js'
import { pageMap, readsKey } from './pages.js'
import {
  REAL_JOURNEY_SET,
  SHARED_DIR,
  listSets,
  setDir,
  setInfo,
  toRepoPath,
  walkFiles
} from './repo.js'
import { commentHits, pinnedHits, templateHits } from './scan-sources.js'

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

/**
 * The one name every designer tool takes for the task list: designer:show's
 * --pages, designer:examples' `?page=` and share-my-change's links.
 */
export const TASK_LIST = 'task-list'

/**
 * The one name every designer tool takes for a page: its address inside a
 * notification (`consignors/select`), `task-list` for the task list, or the
 * id itself for any other page with no address of its own (`dashboard`).
 * designer:show's --pages and designer:examples' `?page=` both take it.
 */
export const showNameOf = (pageId, map) => {
  if (pageId === 'hub') {
    return TASK_LIST
  }
  for (const pages of map.featurePages.values()) {
    const page = pages.find((candidate) => candidate.id === pageId)
    if (page) {
      return page.slug || page.id
    }
  }
  return pageId
}

/** Error messages show only on their own page's error state, never on the
 * pages that borrow the page's labels (check your answers). */
const isErrorKey = (keyPath) => keyPath.split('.').includes('errors')

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
  const pages = map ? pagesOfLeaf(leaf, map) : []
  const alsoOn =
    map && !isErrorKey(leaf.keyPath)
      ? (map.shownOn.get(leaf.feature) ?? [])
          .filter(({ keys }) => readsKey(keys, leaf.keyPath))
          .flatMap(({ feature }) => pagesOfFeature(feature, map))
      : []
  const nameOf = (id) => (map ? showNameOf(id, map) : id)
  return {
    setId: leaf.setId,
    shared: leaf.shared,
    feature: leaf.feature,
    pages,
    alsoOn,
    pageNames: pages.map(nameOf),
    alsoOnNames: alsoOn.map(nameOf),
    showPages: [...new Set([...pages, ...alsoOn].map(nameOf))],
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

/** Comments in the copy files that quote the words (English and Welsh). */
const findInComments = (root, copyFiles, text) =>
  copyFiles
    .flatMap(({ setId, shared, enFile, cyFile }) =>
      [enFile, cyFile]
        .filter((file) => existsSync(file))
        .map((file) => ({ setId, shared, file }))
    )
    .flatMap(({ setId, shared, file }) =>
      commentHits(readFileSync(file, 'utf8'), text).map((hit) => ({
        setId,
        shared,
        file: toRepoPath(root, file),
        line: hit.line,
        text: hit.text
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

const PAGE_ALIASES = Object.freeze({
  hub: TASK_LIST,
  overview: TASK_LIST,
  'check-answers': 'notification-view',
  'check-your-answers': 'notification-view'
})

const allPageNames = (map) => [
  ...new Set(
    [...map.featurePages.values()]
      .flat()
      .map((page) => showNameOf(page.id, map))
  ),
  ...(map.featurePages.has('hub') ? [TASK_LIST] : [])
]

/**
 * The page a designer means: its address (`consignors/select`), its id
 * (`consignor-select`), `task-list` / `hub`, or `check-answers`. Null when the
 * set has no such page.
 */
export const resolvePage = (name, map) => {
  const wanted = String(name)
    .trim()
    .replace(/^\/+|\/+$/g, '')
  const aliased = PAGE_ALIASES[wanted.toLowerCase()] ?? wanted
  const names = allPageNames(map)
  if (names.includes(aliased)) {
    return aliased
  }
  const asId = showNameOf(aliased, map)
  return names.includes(asId) ? asId : null
}

/**
 * Every copy string one page shows: its own copy, its section caption and
 * the labels it borrows from other pages. For finding words the designer
 * names by where they sit ("the hint on origin") rather than by quoting them.
 *
 * @param {{ root: string, page: string, setId: string }} options
 */
export const pageWords = async ({ root, page, setId }) => {
  const [id] = setsInScope(root, setId)
  const map = await pageMap(root, id)
  const name = resolvePage(page, map)
  if (!name) {
    throw new Error(
      `There is no page called '${page}' in ${id}. Its pages are: ${allPageNames(map).join(', ')}.`
    )
  }
  const leaves = (
    await Promise.all(
      setCopyFiles(root, id).map((copyFile) => loadLeaves(root, copyFile))
    )
  ).flat()
  const copy = leaves
    .map((leaf) => describeLeaf(leaf, map))
    .filter(
      (entry) =>
        entry.pageNames.includes(name) || entry.alsoOnNames.includes(name)
    )
  return {
    page: name,
    sets: [setInfo(root, id)],
    copy,
    ...(name === TASK_LIST ? { groups: taskListGroups(root, id, leaves) } : {})
  }
}

const HUB_CONTROLLER = 'journeys/linear/features/hub/controller.js'
const GROUP_ENTRY = /\{\s*id:\s*'([^']+)',\s*rows:\s*\[([^\]]*)\]\s*\}/g

/**
 * The task list's groups in order, each with its caption and the titles of
 * the tasks under it, read from the hub's `GROUPS` and its copy. Lets a
 * designer see whether a renamed group still fits what sits under it. Empty
 * when the release has no hub controller to read.
 */
export const taskListGroups = (root, setId, leaves) => {
  const file = path.join(setDir(root, setId), HUB_CONTROLLER)
  if (!existsSync(file)) {
    return []
  }
  const source = readFileSync(file, 'utf8')
  const groupsSource = /GROUPS\s*=\s*\[([\s\S]*?)\n\]/.exec(source)?.[1] ?? ''
  const hubText = (keyPath) => {
    const leaf = leaves.find(
      (candidate) =>
        candidate.feature === 'hub' &&
        candidate.setId === setId &&
        candidate.keyPath === keyPath
    )
    return leaf ? leafText(leaf.en) : null
  }
  return [...groupsSource.matchAll(GROUP_ENTRY)].map(([, groupId, rows]) => ({
    id: groupId,
    caption: hubText(`groups.${groupId}`) ?? groupId,
    rows: [...rows.matchAll(/'([^']+)'/g)].map(
      ([, rowId]) => hubText(`rows.${rowId}.title`) ?? rowId
    )
  }))
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
    comments: findInComments(root, copyFiles, text),
    pinned
  }
}
