import Boom from '@hapi/boom'

/**
 * The 503 a reader throws when a reference-data list cannot be loaded.
 *
 * @param {string} dataset - the list that failed to load, such as `countries`
 * @param {unknown} cause - the error the load failed with
 * @returns {import('@hapi/boom').Boom} a 503 Boom carrying `cause` and `{ dataset }`
 */
export const referenceDataUnavailable = (dataset, cause) =>
  Boom.serverUnavailable(new Error('Reference data unavailable', { cause }), {
    dataset
  })
