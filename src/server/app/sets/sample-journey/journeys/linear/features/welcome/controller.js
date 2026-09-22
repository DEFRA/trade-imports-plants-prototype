import { dashboardRoutePath } from '../../../../../../shared/paths.js'
import * as kit from '../../../../../../shared/kit.js'
import { TEMPLATES } from '../../config.js'
import { welcomePage as page } from './page.js'

export const meta = { ...page, collects: ['consignmentReference'] }

const view = `${TEMPLATES}/features/welcome/template`

/**
 * The whole of this set's user-facing surface: one page, so the prototype host
 * has a second set to mount and the chooser at `/` has somewhere to link to.
 * A real prototype replaces this with its own journey.
 */
const get = (_request, h) =>
  h.view(view, {
    ...kit.base('Sample journey'),
    heading: 'Sample journey',
    body:
      'A placeholder set, here to prove this service can host more than one ' +
      'prototype at a time. Each set is served under its own path.'
  })

export const routes = [
  {
    method: 'GET',
    path: dashboardRoutePath(),
    options: kit.routeOptions,
    handler: get
  }
]
