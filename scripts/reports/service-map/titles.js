/**
 * The words the service map uses, read from a set's own English copy:
 * page titles, the option labels a decision's values show as, the labels of
 * fields on a page, and the hub's group and row names.
 *
 * A page's title comes from the controller that serves its address: every
 * `*controller.js` in the set's feature folders is read for the GET routes it
 * declares, and the copy in the same feature folder (`copy/copy.en.js`) gives
 * the title — `copy[<sub-folder>].title` for a controller in a sub-folder
 * (`list`, `details`), else `copy.title`. Only English is read.
 */
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const COPY_FILE = path.join('copy', 'copy.en.js')
const CONTROLLER = /controller\.js$/

export const HUB_ROUTE = '/notifications/{journeyId}'
export const DASHBOARD_ROUTE = '/'

/** The route a flow page is served at, as its controller declares it. */
export const pageRoute = (page) =>
  page.slug ? `/notifications/{journeyId}/${page.slug}` : DASHBOARD_ROUTE

/**
 * An id as words: `arrival-status` and `arrivalStatus` both become
 * "Arrival status".
 *
 * @param {string} id
 * @returns {string}
 */
export const humanise = (id) => {
  const words = String(id)
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/[-_/]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const controllerFiles = (dir, base = dir) => {
  if (!existsSync(dir)) {
    return []
  }
  return readdirSync(dir, { withFileTypes: true })
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .flatMap((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return entry.name === 'copy' ? [] : controllerFiles(full, base)
      }
      return CONTROLLER.test(entry.name) && !entry.name.endsWith('.test.js')
        ? [path.relative(base, full)]
        : []
    })
}

const servesGet = (route) =>
  [route.method]
    .flat()
    .map((method) => String(method).toUpperCase())
    .some((method) => method === 'GET' || method === '*')

/**
 * Every GET route a set's features serve, with the feature folder and
 * sub-folder of its controller, and each feature's English copy.
 *
 * @param {string} journeyDir - the set's `journeys/linear` folder.
 * @returns {Promise<{ byRoute: Map<string, { folder: string, sub: string }>,
 *   copyByFolder: Map<string, object> }>}
 */
export const readFeatureIndex = async (journeyDir) => {
  const featuresDir = path.join(journeyDir, 'features')
  const byRoute = new Map()
  const copyByFolder = new Map()
  if (!existsSync(featuresDir)) {
    return { byRoute, copyByFolder }
  }
  const folders = readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted((a, b) => a.localeCompare(b))
  for (const folder of folders) {
    const folderDir = path.join(featuresDir, folder)
    const copyFile = path.join(folderDir, COPY_FILE)
    if (existsSync(copyFile)) {
      const { copy } = await import(pathToFileURL(copyFile).href)
      if (isPlainObject(copy)) {
        copyByFolder.set(folder, copy)
      }
    }
    for (const file of controllerFiles(folderDir)) {
      const controller = await import(
        pathToFileURL(path.join(folderDir, file)).href
      )
      const sub = path.dirname(file) === '.' ? '' : path.dirname(file)
      for (const route of controller.routes ?? []) {
        if (servesGet(route) && !byRoute.has(route.path)) {
          byRoute.set(route.path, { folder, sub })
        }
      }
    }
  }
  return { byRoute, copyByFolder }
}

const subCopy = (copy, sub) =>
  sub
    .split(path.sep)
    .filter(Boolean)
    .reduce((node, key) => (isPlainObject(node) ? node[key] : undefined), copy)

/**
 * The English copy of the feature that serves `route`, or null.
 *
 * @param {{ byRoute: Map, copyByFolder: Map }} index
 * @param {string} route
 * @returns {object|null}
 */
export const copyOfRoute = (index, route) => {
  const entry = index.byRoute.get(route)
  return entry ? (index.copyByFolder.get(entry.folder) ?? null) : null
}

/**
 * The title of the page served at `route`, from its feature's copy, or null
 * when there is none to read.
 *
 * @param {{ byRoute: Map, copyByFolder: Map }} index
 * @param {string} route
 * @returns {string|null}
 */
export const titleOfRoute = (index, route) => {
  const entry = index.byRoute.get(route)
  const copy = entry ? index.copyByFolder.get(entry.folder) : null
  if (!copy) {
    return null
  }
  const own = entry.sub ? subCopy(copy, entry.sub)?.title : undefined
  if (typeof own === 'string') {
    return own
  }
  return typeof copy.title === 'string' ? copy.title : null
}

const allStrings = (object) =>
  Object.values(object).every((value) => typeof value === 'string')

const labelObjects = (node, found = []) => {
  if (!isPlainObject(node)) {
    return found
  }
  if (Object.keys(node).length > 0 && allStrings(node)) {
    found.push(node)
  }
  for (const child of Object.values(node)) {
    labelObjects(child, found)
  }
  return found
}

/**
 * The labels a page shows for a decision's values: the object of plain
 * strings in its copy whose keys name the most of `values` (the first such
 * object on a tie), or null when no object names any of them.
 *
 * @param {object|null} copy
 * @param {unknown[]} values
 * @returns {Record<string, string>|null}
 */
export const labelsFor = (copy, values) => {
  const wanted = new Set(values.map(String))
  let best = null
  let bestCount = 0
  for (const candidate of labelObjects(copy)) {
    const count = Object.keys(candidate).filter((key) => wanted.has(key)).length
    if (count > bestCount) {
      best = candidate
      bestCount = count
    }
  }
  return best
}

const findFieldLabel = (node, name) => {
  if (!isPlainObject(node)) {
    return null
  }
  const own = node[name]
  if (isPlainObject(own) && typeof own.label === 'string') {
    return own.label
  }
  for (const child of Object.values(node)) {
    const label = findFieldLabel(child, name)
    if (label) {
      return label
    }
  }
  return null
}

/**
 * A field's label from a page's copy (`fields.genus.label`, or any
 * `<name>.label`), else the field's name as words.
 *
 * @param {object|null} copy
 * @param {string} name
 * @returns {string}
 */
export const fieldLabelFor = (copy, name) =>
  findFieldLabel(copy, name) ?? humanise(name)
