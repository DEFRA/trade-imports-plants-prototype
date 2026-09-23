import { makeCreate, makeCopy } from './lifecycle/create.js'
import { makeLoad, makeList, makeHas } from './lifecycle/read.js'
import { makeReplaceFulfilment, makeClear } from './lifecycle/mutate.js'
import {
  makeFinalise,
  makeAmend,
  makeCancelAmend,
  makeSoftDelete
} from './lifecycle/transition.js'
import { createStore, defaultStore } from './store/state.js'

/**
 * A records instance over its own store.
 *
 * Each mounted set configures one, so a draft started in one set is invisible
 * to another: the sets share the interface, never the journeys behind it.
 *
 * @param {object} [store] - the store to build over. Defaults to a fresh one.
 * @returns {object} the records interface.
 */
export const createRecords = (store = createStore()) => ({
  create: makeCreate(store),
  load: makeLoad(store),
  list: makeList(store),
  has: makeHas(store),
  replaceFulfilment: makeReplaceFulfilment(store),
  finalise: makeFinalise(store),
  amend: makeAmend(store),
  cancelAmend: makeCancelAmend(store),
  copy: makeCopy(store),
  softDelete: makeSoftDelete(store),
  clear: makeClear(store)
})

/** The module's one shared instance, for a caller that wants the stub itself
 * rather than a store of its own — every engine and controller test. */
export const records = createRecords(defaultStore)
