import * as stubState from '../app/services/persistence/records/stub/store/state.js'
import { withSetContext } from '../app/shared/set-context.js'
import { isStubDataMode } from '../common/services/mode.js'
import {
  dataDir,
  dataFile,
  persistenceEnabled,
  readJson,
  removeFile,
  writeJson
} from './persist.js'
import * as seedLink from './seed-link.js'

const SAVED_VERSION = 1

const OFF = Object.freeze({
  enabled: false,
  file: null,
  restore: () => 0,
  save: () => false,
  remove: () => {}
})

const isSaved = (saved, setId) =>
  saved?.version === SAVED_VERSION &&
  saved.setId === setId &&
  Array.isArray(saved.journeys)

/**
 * Saves one set's records to `.cache/designer/data/<set-id>.json` after every
 * change, and puts them back when the prototype starts.
 *
 * It copies the stub records store's own documents as they are, so a restored
 * draft keeps its reference number and the browser's list of known
 * notifications still finds it.
 *
 * Off unless all three hold: persistence is enabled (`npm run dev`, see
 * `persistenceEnabled`), the records are the stub store (never a real
 * backend), and the caller has not turned it off.
 *
 * @param {string} setId - the set whose records are saved.
 * @param {object} [options]
 * @param {boolean} [options.persist] - force on or off; tests pass true.
 * @param {string} [options.dir] - the data folder; `dataDir()` by default.
 * @param {object} [options.state] - the stub store's per-set state module.
 * @param {object} [options.seed] - the seeder link (see `seed-link.js`).
 * @returns {{enabled: boolean, file: string|null, restore: Function, save: Function, remove: Function}}
 * the persistence for that set.
 */
export const recordsPersistence = (
  setId,
  {
    persist = persistenceEnabled() && isStubDataMode(),
    dir,
    state = stubState,
    seed = seedLink
  } = {}
) => {
  if (!persist) {
    return OFF
  }
  const file = dataFile(dir ?? dataDir(), setId)

  const snapshot = () => ({
    version: SAVED_VERSION,
    setId,
    savedAt: new Date().toISOString(),
    seeded: seed.hasBeenSeeded(setId),
    seededIds: seed.seededIds(setId),
    seededExamples: seed.seededExamples(setId),
    journeys: [...state.journeys().values()],
    copies: [...state.copiesBySourceAndKey().entries()]
  })

  /** Puts saved records back. Returns how many notifications came back. */
  const restore = () =>
    withSetContext(setId, () => {
      const saved = readJson(file)
      if (!isSaved(saved, setId)) {
        return 0
      }
      for (const journey of saved.journeys) {
        state.journeys().set(journey.id, journey)
      }
      for (const [key, journeyId] of saved.copies ?? []) {
        state.copiesBySourceAndKey().set(key, journeyId)
      }
      if (saved.seeded === true) {
        seed.recordSeeded(
          setId,
          Array.isArray(saved.seededIds) ? saved.seededIds : [],
          Array.isArray(saved.seededExamples) ? saved.seededExamples : []
        )
      }
      return saved.journeys.length
    })

  /** Saves the set's records now. Returns false when it waited instead,
   * because the examples are still being made. */
  const save = () => {
    if (seed.seedingPending(setId)) {
      return false
    }
    withSetContext(setId, () => writeJson(file, snapshot()))
    return true
  }

  /** Forgets the saved records: Reset starts the set from nothing. */
  const remove = () => removeFile(file)

  return { enabled: true, file, restore, save, remove }
}
