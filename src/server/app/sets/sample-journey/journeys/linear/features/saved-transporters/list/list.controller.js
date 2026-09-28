import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { dashboardPath } from '../../../../../../../shared/paths.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { addPath, paginationFor, rowOf } from '../view-model/list.js'

const copy = copyFor({ en, cy })
const DECIMAL = 10
const view = `${TEMPLATES}/features/saved-transporters/list/list`

const pageNumber = (value) => Number.parseInt(value, DECIMAL) || 1

const get = async (request, h) => {
  const query = String(request.query.q ?? '').trim()
  const found = await transporters.listTransporters(organisationIdOf(request), {
    search: query,
    page: pageNumber(request.query.page)
  })
  return h.view(view, {
    ...kit.base(copy.list.title, { backLink: dashboardPath() }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    query,
    addHref: addPath(),
    resultsCaption: copy.list.resultsCaption(found.results.length, found.total),
    rows: found.results.map(rowOf),
    pagination: paginationFor(query, found, copy.list.pagination)
  })
}

export const routes = [
  {
    method: 'GET',
    path: '/transporters',
    options: kit.routeOptions,
    handler: get
  }
]
