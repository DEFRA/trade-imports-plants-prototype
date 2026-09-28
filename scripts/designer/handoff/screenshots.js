/**
 * Picks the screenshots a brief shows, from a `designer:show` run folder, and
 * keeps their total size under a cap so a committed hand-off folder stays
 * small.
 *
 * `designer:show` names each picture `<page>--<version>--<state>--<width>.png`
 * (for example `arrival-details--before--page--desktop.png`), where a page
 * address like `commodities/details` becomes `commodities-details`. Pictures
 * of the changed pages come first; within a page, the desktop "before" and
 * "now" pair comes before error states and phone width.
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

export const SCREENSHOT_CAP_BYTES = 2 * 1024 * 1024

/** In the slugs list: also take every other page in the gallery, after the
 * named ones. */
export const ANY_PAGE = '*'

const SHOW_NAME =
  /^(.+)--(now|before|compare|reference)--(page|errors)--(desktop|mobile)\.png$/

const VERSION_ORDER = ['before', 'reference', 'compare', 'now']
const STATE_ORDER = ['page', 'errors']
const WIDTH_ORDER = ['desktop', 'mobile']

/** A page address as it appears in a file name. */
export const fileSafe = (slug) => slug.replaceAll('/', '-')

const pngsUnder = (dir, prefix = '') => {
  const found = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...pngsUnder(full, relative))
    } else if (entry.name.toLowerCase().endsWith('.png')) {
      found.push({ relative, full, bytes: statSync(full).size })
    }
  }
  return found
}

/**
 * What a picture shows: `{ page, version, state, width }`, read from a
 * `designer:show` file name. Null for a file named some other way.
 */
export const describeShot = (relative) => {
  const match = SHOW_NAME.exec(relative.split('/').at(-1))
  if (!match) {
    return null
  }
  const [, page, version, state, width] = match
  return { page, version, state, width }
}

const VERSION_LABELS = {
  before: 'before',
  reference: 'design reference',
  compare: 'real service today',
  now: 'after'
}

/** A short label for a picture: "before", "after, error messages, phone width". */
export const shotLabel = ({ version, state, width }) =>
  [
    VERSION_LABELS[version] ?? version,
    state === 'errors' ? 'error messages' : null,
    width === 'mobile' ? 'phone width' : null
  ]
    .filter(Boolean)
    .join(', ')

const rank = (order, value) => {
  const index = order.indexOf(value)
  return index === -1 ? order.length : index
}

/**
 * Chooses pictures of the given page slugs, in page order and then before,
 * reference, compare, now; page before errors; desktop before phone, until
 * the next one would pass `capBytes`. Returns what was picked and what was
 * left out.
 */
export const pickScreenshots = (
  galleryDir,
  slugs,
  capBytes = SCREENSHOT_CAP_BYTES
) => {
  if (!galleryDir || !existsSync(galleryDir)) {
    return { picked: [], skipped: [], found: false, totalBytes: 0 }
  }
  const anyPage = slugs.includes(ANY_PAGE)
  const named = slugs.filter((slug) => slug !== ANY_PAGE)
  const names = named.map(fileSafe)
  const order = (page) => {
    const index = names.indexOf(page)
    return index === -1 ? names.length : index
  }
  const shots = pngsUnder(galleryDir)
    .map((shot) => ({ ...shot, shown: describeShot(shot.relative) }))
    .filter(
      (shot) => shot.shown && (anyPage || names.includes(shot.shown.page))
    )
    .map((shot) => ({
      ...shot,
      slug: named[names.indexOf(shot.shown.page)] ?? shot.shown.page,
      state: shotLabel(shot.shown)
    }))
    .sort(
      (a, b) =>
        order(a.shown.page) - order(b.shown.page) ||
        a.shown.page.localeCompare(b.shown.page) ||
        rank(VERSION_ORDER, a.shown.version) -
          rank(VERSION_ORDER, b.shown.version) ||
        rank(STATE_ORDER, a.shown.state) - rank(STATE_ORDER, b.shown.state) ||
        rank(WIDTH_ORDER, a.shown.width) - rank(WIDTH_ORDER, b.shown.width)
    )
  const picked = []
  const skipped = []
  let totalBytes = 0
  for (const shot of shots) {
    if (totalBytes + shot.bytes <= capBytes) {
      totalBytes += shot.bytes
      picked.push({ ...shot, fileName: shot.relative.split('/').at(-1) })
    } else {
      skipped.push(shot)
    }
  }
  return { picked, skipped, found: true, totalBytes }
}
