import Boom from '@hapi/boom'
import Joi from 'joi'

import * as kit from '../../../../../../shared/kit.js'

/** The shape every id `idFromName` makes (`prototype-support/search-page.js`):
 * lower-case words joined by hyphens. This catches a param that could never
 * be a real id (empty, capitals, a stray slash); it cannot tell a
 * well-shaped id that does not exist from one that does — the route's
 * handler checks that by asking the service. */
const TRANSPORTER_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const transporterIdParams = Joi.object({
  transporterId: Joi.string()
    .pattern(TRANSPORTER_ID_PATTERN)
    .required()
    .messages({
      'string.pattern.base': 'Enter a valid transporter id',
      'any.required': 'Enter a valid transporter id'
    })
})

export const transporterIdRouteOptions = {
  ...kit.routeOptions,
  validate: {
    params: transporterIdParams,
    failAction: () => {
      throw Boom.notFound()
    }
  }
}
