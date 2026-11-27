import { getTraceId } from '@defra/hapi-tracing'

import {
  currentOrganisationId,
  ORGANISATION_ID_HEADER
} from '../../../../../../common/helpers/organisation-id.js'
import { createLogger } from '../../../../../../common/helpers/logging/logger.js'
import { tracingHeader } from '../config.js'

const logger = createLogger()

export { ORGANISATION_ID_HEADER }

export const headers = () => {
  const organisationId = currentOrganisationId()
  if (!organisationId) {
    const err = new Error(
      'Cannot reach the notifications backend without an organisation from the signed-in session'
    )
    logger.warn({ err }, err.message)
    throw err
  }
  return {
    'Content-Type': 'application/json',
    [tracingHeader]: getTraceId() ?? '',
    [ORGANISATION_ID_HEADER]: organisationId
  }
}
