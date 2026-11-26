import { countExternalCall } from '../call-counts/call-counts.js'
import {
  COUNT,
  MILLISECONDS,
  publishMetricsInBackground
} from './publish-metrics.js'

const interfacePropertyOf = (interfaceId) =>
  interfaceId === undefined ? {} : { Interface: interfaceId }

/**
 * Emits the document for a finished call without making the caller wait for the flush, and logs a warning when it cannot be written.
 *
 * @param {{ dependency: string, operation: string, interfaceId?: string }} externalCall - the call, as the metric contract names it
 * @param {{ durationMs: number, failed: boolean }} result - how long it took and whether it failed
 */
export const recordExternalCallInBackground = (externalCall, result) => {
  const { dependency, operation, interfaceId } = externalCall
  countExternalCall(externalCall)
  publishMetricsInBackground(
    { Dependency: dependency, Operation: operation },
    [
      {
        name: 'ExternalCallDuration',
        value: result.durationMs,
        unit: MILLISECONDS
      },
      { name: 'ExternalCallFailure', value: result.failed ? 1 : 0, unit: COUNT }
    ],
    {
      Outcome: result.failed ? 'failure' : 'success',
      ...interfacePropertyOf(interfaceId)
    }
  )
}

const recordSince = (externalCall, startedAt, failed) =>
  recordExternalCallInBackground(externalCall, {
    durationMs: performance.now() - startedAt,
    failed
  })

/**
 * Runs a call to a system outside the INS boundary, records it, and returns its result.
 *
 * @template T
 * @param {{ dependency: string, operation: string, interfaceId?: string }} externalCall - the call, as the metric contract names it
 * @param {() => Promise<T>} call - the call to run
 * @returns {Promise<T>} the call's result
 */
export const measureExternalCall = async (externalCall, call) => {
  const startedAt = performance.now()
  try {
    const result = await call()
    recordSince(externalCall, startedAt, false)
    return result
  } catch (error) {
    recordSince(externalCall, startedAt, true)
    throw error
  }
}
