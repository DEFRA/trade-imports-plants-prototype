/**
 * Which pages a change shows up on. Reads each set's own flow
 * (journeys/linear/flow/flow.js `sections`) so the answer follows the journey
 * as the designer changes it, with no page list kept by hand.
 */
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { REPO_ROOT, toRepoPath } from './repo.js'
import { setDir, setOfPath } from './sets.js'

const JOURNEY = 'journeys/linear'
const FEATURE_PATH =
  /^src\/server\/app\/sets\/[a-z0-9-]+\/journeys\/[^/]+\/features\/([^/]+)\//
const DASHBOARD_PAGE_ID = 'dashboard'

/**
 * Pages the flow does not list but a designer changes often. The hub (the
 * task list) is reached from every notification rather than by Continue.
 */
const NAMED_PAGES = Object.freeze({
  hub: [
    {
      sectionId: null,
      id: 'hub',
      slug: null,
      feature: 'hub',
      route: '/notifications/{journeyId}'
    }
  ]
})

/** Paths that never change what a page looks like. */
const NO_VISIBLE_CHANGE = [
  /\.test\.js$/,
  /\.spec\.js$/,
  /(^|\/)test-support\.js$/,
  /^src\/server\/app\/sets\/[^/]+\/(docs|spec)\//,
  /^src\/server\/app\/sets\/[^/]+\/[^/]+\.(json|md)$/
]

const routeOf = (page) =>
  page.id === DASHBOARD_PAGE_ID
    ? '/'
    : `/notifications/{journeyId}/${page.slug}`

const importFile = (file) => import(pathToFileURL(file).href)

/** Maps each page object a feature's page.js exports to that feature. */
const featuresByPage = async (featuresDir) => {
  const byPage = new Map()
  if (!existsSync(featuresDir)) {
    return byPage
  }
  const folders = readdirSync(featuresDir, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory()
  )
  for (const folder of folders) {
    const pageFile = path.join(featuresDir, folder.name, 'page.js')
    if (existsSync(pageFile)) {
      const exported = await importFile(pageFile)
      for (const value of Object.values(exported)) {
        byPage.set(value, folder.name)
      }
    }
  }
  return byPage
}

/**
 * Every page in a set's flow, in journey order:
 * `[{ sectionId, id, slug, feature, route }]`. `route` is the path under the
 * set's base, with `{journeyId}` still to fill in. An empty list when the set
 * has no flow.js.
 */
export const pagesOf = async (setId, { root = REPO_ROOT } = {}) => {
  const journeyDir = path.join(setDir(setId, { root }), JOURNEY)
  const flowFile = path.join(journeyDir, 'flow/flow.js')
  if (!existsSync(flowFile)) {
    return []
  }
  const byPage = await featuresByPage(path.join(journeyDir, 'features'))
  const { sections = [] } = await importFile(flowFile)
  return sections.flatMap((section) =>
    section.pages.map((page) => ({
      sectionId: section.id,
      id: page.id,
      slug: page.slug,
      feature: byPage.get(page) ?? null,
      route: routeOf(page)
    }))
  )
}

/**
 * The feature folder a path sits in (for example `origin` for
 * sets/<id>/journeys/linear/features/origin/copy/copy.en.js), or null.
 */
export const featureOfPath = (filePath, { root = REPO_ROOT } = {}) => {
  const repoPath = toRepoPath(filePath, { root })
  const match = repoPath ? FEATURE_PATH.exec(repoPath) : null
  return match ? match[1] : null
}

const hasNoVisibleChange = (repoPath) =>
  NO_VISIBLE_CHANGE.some((pattern) => pattern.test(repoPath))

/** Every page of a set, plus the hub when the set has a notification flow. */
const everyPage = (pages) =>
  pages.length > 1 ? [...pages, ...NAMED_PAGES.hub] : pages

const pagesForPath = (repoPath, pages, root) => {
  if (hasNoVisibleChange(repoPath)) {
    return []
  }
  const feature = featureOfPath(repoPath, { root })
  if (!feature) {
    return everyPage(pages)
  }
  if (NAMED_PAGES[feature]) {
    return NAMED_PAGES[feature]
  }
  const featurePages = pages.filter((page) => page.feature === feature)
  return featurePages.length > 0 ? featurePages : everyPage(pages)
}

/**
 * The pages a set of changed paths shows up on, across every set they touch:
 * `[{ setId, sectionId, id, slug, feature, route }]`, each page once, in
 * journey order within a set.
 *
 * - A file in a feature folder: that feature's pages. The hub is handled by
 *   name, and a feature with no page of its own (a shared helper such as
 *   review or address-book-picker) counts as every page.
 * - Shared copy, captions, flow, obligations, parties, fixtures or the set's
 *   routes file: every page of that set, and the hub.
 * - Tests, specs, docs and release notes: no page.
 * - Anything outside a set: no page.
 */
export const pagesForChangedPaths = async (
  paths,
  { root = REPO_ROOT } = {}
) => {
  const bySet = new Map()
  for (const filePath of paths) {
    const repoPath = toRepoPath(filePath, { root })
    const setId = repoPath ? setOfPath(repoPath, { root }) : null
    if (setId) {
      if (!bySet.has(setId)) {
        bySet.set(setId, [])
      }
      bySet.get(setId).push(repoPath)
    }
  }
  const result = []
  for (const [setId, setPaths] of bySet) {
    if (existsSync(setDir(setId, { root }))) {
      const pages = await pagesOf(setId, { root })
      const wanted = new Set(
        setPaths.flatMap((repoPath) => pagesForPath(repoPath, pages, root))
      )
      const ordered = [...pages, ...NAMED_PAGES.hub].filter((page) =>
        wanted.has(page)
      )
      result.push(...ordered.map((page) => ({ setId, ...page })))
    }
  }
  return result
}
