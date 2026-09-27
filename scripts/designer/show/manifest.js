/**
 * What one designer:show run captured, as data: file names, the plain
 * summary of each accessibility check, and the manifest.json the gallery is
 * drawn from. Pure, so the gallery can be regenerated and tested from a
 * fixture manifest with no browser.
 */

export const MANIFEST_VERSION = 1

/** Which version of the page a picture shows. */
export const VARIANTS = Object.freeze({
  now: 'now',
  before: 'before',
  compare: 'compare',
  reference: 'reference'
})

/** What state the page was in. */
export const STATES = Object.freeze({ page: 'page', errors: 'errors' })

/** How wide the browser was. */
export const WIDTHS = Object.freeze({ desktop: 'desktop', mobile: 'mobile' })

/** Pixel widths for each WIDTHS entry. */
export const VIEWPORTS = Object.freeze({
  desktop: { width: 1280, height: 900 },
  mobile: { width: 320, height: 900 }
})

/** The WCAG 2.2 AA rule tags axe checks against. */
export const AXE_TAGS = Object.freeze([
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22aa'
])

const IMPACT_ORDER = ['critical', 'serious', 'moderate', 'minor']

/** A page name made safe for a file name: `commodities/details` → `commodities-details`. */
export const fileSafe = (key) =>
  String(key)
    .replaceAll('/', '-')
    .replace(/[^a-zA-Z0-9._-]/g, '_')

/** The file name of one picture. */
export const captureFileName = ({ key, variant, state, width }) =>
  `${fileSafe(key)}--${variant}--${state}--${width}.png`

/** A folder name for a run, from its start time: `2026-09-27T14-05-09`. */
export const runFolderName = (date) => {
  const pad = (number) => String(number).padStart(2, '0')
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  ].join('')
}

/**
 * axe's violations reduced to what a designer needs: which rule, how bad,
 * what it means in words, and how many places on the page.
 */
export const summariseAxe = (violations = []) =>
  violations
    .map((violation) => ({
      id: violation.id,
      impact: violation.impact ?? 'minor',
      help: violation.help,
      helpUrl: violation.helpUrl,
      places: Array.isArray(violation.nodes) ? violation.nodes.length : 0,
      targets: (violation.nodes ?? [])
        .slice(0, 5)
        .map((node) => [node.target].flat().join(' '))
    }))
    .sort(
      (a, b) =>
        IMPACT_ORDER.indexOf(a.impact) - IMPACT_ORDER.indexOf(b.impact) ||
        a.id.localeCompare(b.id)
    )

const plural = (count, one, many) => (count === 1 ? one : many)

/** One sentence about a page's accessibility check, in plain words. */
export const axeSentence = (summary) => {
  if (!summary) {
    return 'The accessibility check did not run on this page.'
  }
  if (summary.length === 0) {
    return 'The automatic accessibility check found no problems. It cannot catch everything, so still check the page yourself.'
  }
  const serious = summary.filter((item) =>
    ['critical', 'serious'].includes(item.impact)
  ).length
  const total = summary.length
  const lead = `The automatic accessibility check found ${total} ${plural(total, 'problem', 'problems')}`
  return serious > 0
    ? `${lead}, ${serious} of them serious. Fix these before research or sharing.`
    : `${lead}. None of them are serious.`
}

/** A problem's line in the gallery: "Serious: Form elements must have labels (2 places)". */
export const axeLine = (item) => {
  const impact = item.impact.charAt(0).toUpperCase() + item.impact.slice(1)
  return `${impact}: ${item.help} (${item.places} ${plural(item.places, 'place', 'places')})`
}

/**
 * The manifest.json for a run.
 *
 * @param {object} run - everything the run learned: `{ set, createdAt,
 *   commit, branch, options, localUrl, pages, unreached, neverReached,
 *   changedFiles, notes, video, compare }`. `pages` is
 *   `[{ key, title, path, captures, axe, notes }]` in gallery order.
 */
export const buildManifest = (run) => ({
  version: MANIFEST_VERSION,
  set: run.set,
  compare: run.compare ?? null,
  createdAt: run.createdAt,
  commit: run.commit ?? null,
  branch: run.branch ?? null,
  localUrl: run.localUrl,
  options: run.options,
  pages: run.pages.map((page) => ({
    key: page.key,
    title: page.title ?? null,
    path: page.path ?? null,
    captures: page.captures ?? [],
    axe: page.axe ?? {},
    notes: page.notes ?? []
  })),
  unreached: run.unreached ?? [],
  neverReached: run.neverReached ?? [],
  changedFiles: run.changedFiles ?? [],
  notes: run.notes ?? [],
  video: run.video ?? null
})

/** Every picture in a manifest, in gallery order. */
export const allCaptures = (manifest) =>
  manifest.pages.flatMap((page) => page.captures)

/** The axe.json body: every check's summary, by page and version. */
export const axeReport = (manifest) =>
  Object.fromEntries(manifest.pages.map((page) => [page.key, page.axe]))
