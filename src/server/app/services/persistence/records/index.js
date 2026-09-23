import { isStubMode } from '../../../../common/services/mode.js'
import {
  createRecords as createStubRecords,
  records as stubRecords
} from './stub/index.js'
import { records as realRecords } from './real/index.js'

export const records = isStubMode() ? stubRecords : realRecords

/**
 * A records instance for one mounted set.
 *
 * In stub mode each set gets its own in-memory store, so two sets co-resident
 * in one process cannot see each other's journeys. The real implementation is
 * a client for one backend, which scopes records itself, so every set shares
 * the one instance.
 *
 * @returns {object} the records interface for a set to configure.
 */
export const createRecords = () =>
  isStubMode() ? createStubRecords() : realRecords
