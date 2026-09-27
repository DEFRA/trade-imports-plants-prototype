import { activeSetId, NO_SET } from './active-set.js'
import {
  dataDir,
  dataFile,
  persistenceEnabled,
  readJson,
  removeFile,
  writeJson
} from './persist.js'
import { registerFake } from './registry.js'

const SAVED_VERSION = 1

const belongsTo = (setId) => (starter) =>
  starter.setId === undefined || starter.setId === setId

const ownedBy = (organisationId) => (row) =>
  row.organisationId === organisationId

/**
 * The data behind one fake service: the starter rows from its `data.json`,
 * plus whatever people add while using the prototype.
 *
 * - One pile per set, so resetting one set never empties another's fake.
 * - Added rows are scoped to the organisation that added them, the way the
 *   address book is; starter rows are seen by every organisation.
 * - On a designer's own computer the added rows are saved to
 *   `.cache/designer/data/<set-id>.<name>.json`, so they survive the restart
 *   that saving a file causes. Reset deletes that file.
 *
 * @param {object} options
 * @param {string} options.name - the fake's short id, used in file names.
 * @param {string} options.needsARealService - what the real service would
 * have to provide, in one plain sentence.
 * @param {Array<object>} [options.starters] - the rows from `data.json`. A row
 * with a `setId` is only seen in that set.
 * @param {boolean} [options.persist] - save to disk; by default only when
 * `persistenceEnabled()` says so.
 * @param {string} [options.dir] - the data folder; `dataDir()` by default.
 * @returns {object} the store.
 */
export const createFakeStore = ({
  name,
  needsARealService,
  starters = [],
  persist,
  dir
}) => {
  const bySet = new Map()
  const persisting = (setId) =>
    setId !== NO_SET && (persist ?? persistenceEnabled())
  const fileFor = (setId) => dataFile(dir ?? dataDir(), setId, name)

  const stateFor = (setId) => {
    if (!bySet.has(setId)) {
      const saved = persisting(setId) ? readJson(fileFor(setId)) : null
      bySet.set(setId, {
        rows: Array.isArray(saved?.rows) ? saved.rows : []
      })
    }
    return bySet.get(setId)
  }

  const save = (setId) => {
    if (persisting(setId)) {
      writeJson(fileFor(setId), {
        version: SAVED_VERSION,
        service: name,
        setId,
        rows: stateFor(setId).rows
      })
    }
  }

  const hiddenIds = (setId, organisationId) => {
    const hidden = stateFor(setId).rows.filter(
      (row) => row.hidden && ownedBy(organisationId)(row)
    )
    return new Set(hidden.map((row) => row.id))
  }

  /** Every row one organisation can see in the active set, starters first. */
  const visible = (organisationId) => {
    const setId = activeSetId()
    const hidden = hiddenIds(setId, organisationId)
    const added = stateFor(setId).rows.filter(
      (row) => !row.hidden && ownedBy(organisationId)(row)
    )
    return [...starters.filter(belongsTo(setId)), ...added]
      .filter((row) => !hidden.has(row.id))
      .map((row) => structuredClone(row))
  }

  const find = (organisationId, id) =>
    visible(organisationId).find((row) => row.id === id)

  const takenIds = (organisationId) => {
    const added = stateFor(activeSetId()).rows.filter(ownedBy(organisationId))
    return new Set([...starters, ...added].map((row) => row.id))
  }

  const add = (organisationId, record) => {
    const setId = activeSetId()
    const row = { ...structuredClone(record), organisationId }
    stateFor(setId).rows.push(row)
    save(setId)
    return structuredClone(row)
  }

  /** Removes an added row, or hides a starter row for one organisation.
   * Returns false when the organisation cannot see the row. */
  const remove = (organisationId, id) => {
    const setId = activeSetId()
    if (!find(organisationId, id)) {
      return false
    }
    const state = stateFor(setId)
    const isStarter = starters.some((row) => row.id === id)
    state.rows = state.rows.filter(
      (row) => !(row.id === id && ownedBy(organisationId)(row))
    )
    if (isStarter) {
      state.rows.push({ id, organisationId, hidden: true })
    }
    save(setId)
    return true
  }

  const clear = (setId = activeSetId()) => {
    bySet.set(setId, { rows: [] })
    if (persisting(setId)) {
      removeFile(fileFor(setId))
    }
  }

  registerFake({ name, needsARealService, clear })

  return { name, visible, find, takenIds, add, remove, clear }
}
