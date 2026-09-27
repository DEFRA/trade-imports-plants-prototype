import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** Where every set's folder lives. */
export const SETS_DIR = fileURLToPath(new URL('../app/sets/', import.meta.url))

/** The real plants journey: plants-frontend's, updated by the weekly sync. */
export const REAL_JOURNEY = 'high-risk-plants'

/** The one-page set kept to prove the host can serve more than one. */
export const PLACEHOLDER = 'sample-journey'

/**
 * What a set is, for the chooser and for `designer:release list`, in the
 * order the chooser lists them.
 */
export const KINDS = Object.freeze({
  real: { order: 0, tag: 'Real journey, updates weekly', colour: 'blue' },
  working: { order: 1, tag: 'Working release', colour: 'green' },
  research: { order: 2, tag: 'Research', colour: 'purple' },
  frozen: { order: 3, tag: 'Frozen', colour: 'grey' },
  placeholder: { order: 4, tag: 'Placeholder', colour: 'grey' }
})

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC'
})

/** `2026-09-27T10:00:00.000Z` -> `27 September 2026`, the GOV.UK date style. */
export const longDate = (isoDate) => DATE_FORMAT.format(new Date(isoDate))

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

const TABLE_SEPARATOR = /^\|\s*:?-{3,}/

/**
 * How many design gaps a release has logged in `sets/<id>/design-gaps.md`:
 * the body rows of its table, or its list items when it has no table.
 */
export const countDesignGaps = (markdown) => {
  const lines = markdown.split('\n').map((line) => line.trim())
  const separatorAt = lines.findIndex((line) => TABLE_SEPARATOR.test(line))
  if (separatorAt !== -1) {
    return lines.slice(separatorAt + 1).filter((line) => line.startsWith('|'))
      .length
  }
  return lines.filter((line) => /^[-*] /.test(line)).length
}

const kindOf = (setId, record) => {
  if (setId === REAL_JOURNEY) {
    return 'real'
  }
  if (setId === PLACEHOLDER) {
    return 'placeholder'
  }
  if (record?.frozen) {
    return 'frozen'
  }
  return record?.purpose === 'research' ? 'research' : 'working'
}

/**
 * Everything the prototype knows about one set: its kind, where it was made
 * from and when, whether research mode is on and how many design gaps it
 * has. Reads `sets/<id>/release.json`, `research-mode.md` and
 * `design-gaps.md`; a set without them is still described.
 *
 * @param {string} setId
 * @param {{ setsDir?: string }} [options]
 */
export const releaseInfoFor = (setId, { setsDir = SETS_DIR } = {}) => {
  const setDir = path.join(setsDir, setId)
  const record = readJson(path.join(setDir, 'release.json'))
  const gapsFile = path.join(setDir, 'design-gaps.md')
  const kind = kindOf(setId, record)
  return {
    setId,
    kind,
    ...KINDS[kind],
    record,
    from: record?.from ?? null,
    createdAt: record?.createdAt ?? null,
    frozen: Boolean(record?.frozen),
    researchMode: existsSync(path.join(setDir, 'research-mode.md')),
    designGaps: existsSync(gapsFile)
      ? countDesignGaps(readFileSync(gapsFile, 'utf8'))
      : 0
  }
}

/**
 * Real journey first, then working, research, frozen and placeholder sets,
 * newest first within each.
 */
export const byChooserOrder = (a, b) =>
  a.order - b.order ||
  (b.createdAt ?? '').localeCompare(a.createdAt ?? '') ||
  a.setId.localeCompare(b.setId)
