import Boom from '@hapi/boom'

import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { transporterIdRouteOptions } from '../transporter-id-params.js'
import { listPath } from '../view-model/list.js'

const copy = copyFor({ en, cy })
const view = `${TEMPLATES}/features/saved-transporters/delete/delete`

/** The named transporter, or a 404: `{transporterId}` is shape-checked by
 * `transporterIdRouteOptions` first, but a well-shaped id can still belong
 * to no transporter — the organisation's own, or another's, or a deleted
 * one. */
const loadTransporter = async (request) => {
  const found = await transporters.getTransporter(
    organisationIdOf(request),
    request.params.transporterId
  )
  if (!found) {
    throw Boom.notFound()
  }
  return found
}

const get = async (request, h) => {
  const transporter = await loadTransporter(request)
  return h.view(view, {
    ...kit.base(copy.remove.title(transporter.name), { backLink: listPath() }),
    copy,
    heading: copy.remove.title(transporter.name),
    cancelHref: listPath()
  })
}

const post = async (request, h) => {
  await loadTransporter(request)
  await transporters.deleteTransporter(
    organisationIdOf(request),
    request.params.transporterId
  )
  return h.redirect(listPath())
}

export const routes = [
  {
    method: 'GET',
    path: '/transporters/{transporterId}/delete',
    options: transporterIdRouteOptions,
    handler: get
  },
  {
    method: 'POST',
    path: '/transporters/{transporterId}/delete',
    options: transporterIdRouteOptions,
    handler: post
  }
]
