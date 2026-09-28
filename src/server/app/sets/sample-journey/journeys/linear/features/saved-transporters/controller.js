import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../lib/http-status.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as kit from '../../../../../../shared/kit.js'
import { dashboardPath } from '../../../../../../shared/paths.js'
import * as transporters from '../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../common/helpers/organisation-id.js'
import { TEMPLATES } from '../../config.js'
import { copy as cy } from './copy/copy.cy.js'
import { copy as en } from './copy/copy.en.js'
import {
  formErrorsFor,
  listPath,
  paginationFor,
  rowOf,
  valuesFrom
} from './view-model.js'

/**
 * Saved transporters: a working example of a prototype-owned service
 * (`src/server/app/services/transporters/`) behind real GOV.UK pages. Search
 * and page through an organisation's transporters, add one (the service's
 * refusals become the form's errors) and delete one after a check. The
 * chooser's "Reset this prototype's data" puts the starter transporters
 * back, for this set only.
 *
 * Copy these pages, not this set: `sample-journey` is the placeholder. A
 * design release builds the same pages in its own features.
 */

const copy = copyFor({ en, cy })
const DECIMAL = 10

const viewOf = (name) => `${TEMPLATES}/features/saved-transporters/${name}`

const pageNumber = (value) => Number.parseInt(value, DECIMAL) || 1

const list = async (request, h) => {
  const query = String(request.query.q ?? '').trim()
  const found = await transporters.listTransporters(organisationIdOf(request), {
    search: query,
    page: pageNumber(request.query.page)
  })
  return h.view(viewOf('list'), {
    ...kit.base(copy.list.title, { backLink: dashboardPath() }),
    contentColumnClass: kit.surfaceClass('display'),
    copy,
    query,
    addHref: `${listPath()}/add`,
    resultsCaption: copy.list.resultsCaption(found.results.length, found.total),
    rows: found.results.map(rowOf),
    pagination: paginationFor(query, found, copy.list.pagination)
  })
}

const renderAdd = (h, values = {}, errors = {}) =>
  h.view(viewOf('add'), {
    ...kit.base(copy.add.title, { backLink: listPath() }),
    copy,
    values,
    cancelHref: listPath(),
    types: transporters.TRANSPORTER_TYPES.map((type) => ({
      value: type,
      text: copy.add.types[type],
      checked: values.transporterType === type
    })),
    errorSummary: kit.errorSummary(errors),
    errors: Object.fromEntries(
      Object.keys(errors).map((field) => [field, kit.fieldError(errors, field)])
    )
  })

const showAdd = (_request, h) => renderAdd(h)

const add = async (request, h) => {
  const values = valuesFrom(request.payload)
  try {
    const added = await transporters.createTransporter(
      organisationIdOf(request),
      values
    )
    return h.redirect(`${listPath()}?q=${encodeURIComponent(added.name)}`)
  } catch (error) {
    if (!transporters.isValidationFailure(error)) {
      throw error
    }
    const refused = transporters.mapApiErrorsToFormErrors(error.body)
    return renderAdd(h, values, formErrorsFor(refused, copy.errors)).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
}

const showDelete = async (request, h) => {
  const transporter = await transporters.getTransporter(
    organisationIdOf(request),
    request.params.transporterId
  )
  if (!transporter) {
    return h.redirect(listPath())
  }
  return h.view(viewOf('delete'), {
    ...kit.base(copy.remove.title(transporter.name), { backLink: listPath() }),
    copy,
    heading: copy.remove.title(transporter.name),
    cancelHref: listPath()
  })
}

const remove = async (request, h) => {
  await transporters.deleteTransporter(
    organisationIdOf(request),
    request.params.transporterId
  )
  return h.redirect(listPath())
}

const route = (method, path, handler) => ({
  method,
  path,
  options: kit.routeOptions,
  handler
})

export const routes = [
  route('GET', '/transporters', list),
  route('GET', '/transporters/add', showAdd),
  route('POST', '/transporters/add', add),
  route('GET', '/transporters/{transporterId}/delete', showDelete),
  route('POST', '/transporters/{transporterId}/delete', remove)
]
