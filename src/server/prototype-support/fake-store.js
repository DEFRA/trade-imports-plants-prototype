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
 * The data behind one prototype-owned service's `stub.js`: its starter rows,
 * plus whatever people add, change or delete while using the prototype. It
 * behaves the way a real multi-tenant backend would:
 *
 * - One pile per set (per design release), so a row added in one release
 *   never shows in another, and Reset of one release never empties another's.
 * - Added and changed rows are scoped to the organisation that made them, the
 *   way the address book is; starter rows are seen by every organisation.
 *   Deleting or changing a starter only affects that organisation.
 * - On a designer's own computer the added rows are saved to
 *   `.cache/designer/data/<set-id>.<name>.json`, so they survive the restart
 *   that saving a file causes. Reset deletes that file.
 *
 * @param {object} options
 * @param {string} options.name - the store's short id, used in file names.
 * @param {Array<object>|(() => Array<object>)} [options.starters] - the starter
 * rows, or a function that answers them for the active set. A row with a
 * `setId` is only seen in that set.
 * @param {boolean} [options.persist] - save to disk; by default only when
 * `persistenceEnabled()` says so.
 * @param {string} [options.dir] - the data folder; `dataDir()` by default.
 * @returns {object} the store.
 */
export const createFakeStore = ({ name, starters = [], persist, dir }) => {
  const bySet = new Map()
  let version = 0
  const startersNow = () =>
    typeof starters === 'function' ? starters() : starters
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
    version += 1
    if (persisting(setId)) {
      writeJson(fileFor(setId), {
        version: SAVED_VERSION,
        service: name,
        setId,
        rows: stateFor(setId).rows
      })
    }
  }

  /** Every row one organisation can see in the active set, starters first,
   * with that organisation's changes laid over them. */
  const visible = (organisationId) => {
    const setId = activeSetId()
    const own = stateFor(setId).rows.filter(ownedBy(organisationId))
    const hidden = new Set(own.filter((row) => row.hidden).map(({ id }) => id))
    const added = own.filter((row) => !row.hidden)
    const addedById = new Map(added.map((row) => [row.id, row]))
    const shown = startersNow().filter(belongsTo(setId))
    const starterIds = new Set(shown.map(({ id }) => id))
    return [
      ...shown.map((row) => addedById.get(row.id) ?? row),
      ...added.filter((row) => !starterIds.has(row.id))
    ]
      .filter((row) => !hidden.has(row.id))
      .map((row) => structuredClone(row))
  }

  const find = (organisationId, id) =>
    visible(organisationId).find((row) => row.id === id)

  const takenIds = (organisationId) => {
    const added = stateFor(activeSetId()).rows.filter(ownedBy(organisationId))
    return new Set([...startersNow(), ...added].map((row) => row.id))
  }

  const add = (organisationId, record) => {
    const setId = activeSetId()
    const row = { ...structuredClone(record), organisationId }
    stateFor(setId).rows.push(row)
    save(setId)
    return structuredClone(row)
  }

  /** Lays changes over a row one organisation can see. A changed starter is
   * kept as that organisation's own copy. Returns undefined when the
   * organisation cannot see the row. */
  const update = (organisationId, id, changes) => {
    const setId = activeSetId()
    const current = find(organisationId, id)
    if (!current) {
      return undefined
    }
    const state = stateFor(setId)
    const changed = {
      ...current,
      ...structuredClone(changes),
      id,
      organisationId
    }
    state.rows = [
      ...state.rows.filter(
        (row) => !(row.id === id && ownedBy(organisationId)(row))
      ),
      changed
    ]
    save(setId)
    return structuredClone(changed)
  }

  /** Removes an added row, or hides a starter row for one organisation.
   * Returns false when the organisation cannot see the row. */
  const remove = (organisationId, id) => {
    const setId = activeSetId()
    if (!find(organisationId, id)) {
      return false
    }
    const state = stateFor(setId)
    const isStarter = startersNow().some((row) => row.id === id)
    state.rows = state.rows.filter(
      (row) => !(row.id === id && ownedBy(organisationId)(row))
    )
    if (isStarter) {
      state.rows.push({ id, organisationId, hidden: true })
    }
    save(setId)
    return true
  }

  /**
   * What people changed in one set, across every organisation: the rows they
   * added or changed, and the ids they deleted. For an overlay that has no
   * organisation to ask for, such as the address book pickers' view.
   *
   * @param {string} [setId] - the set; the active set by default.
   * @returns {{ added: object[], hiddenIds: Set<string>, version: number }}
   * `version` changes whenever the store does, so a caller can cache.
   */
  const changes = (setId = activeSetId()) => {
    const { rows } = stateFor(setId)
    return {
      added: rows.filter((row) => !row.hidden).map((row) => ({ ...row })),
      hiddenIds: new Set(rows.filter((row) => row.hidden).map(({ id }) => id)),
      version
    }
  }

  const clear = (setId = activeSetId()) => {
    bySet.set(setId, { rows: [] })
    version += 1
    if (persisting(setId)) {
      removeFile(fileFor(setId))
    }
  }

  registerFake({ name, clear })

  return {
    name,
    visible,
    find,
    takenIds,
    add,
    update,
    remove,
    changes,
    clear
  }
}
