import { HTTP_STATUS_BAD_REQUEST } from '../../../../../../../lib/http-status.js'
import { validate } from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { organisationIdOf } from '../../../../../../../../common/helpers/organisation-id.js'
import { TEMPLATES } from '../../../config.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import {
  TRANSPORTER_TYPES,
  countryOptions,
  formErrorsFor,
  transporterRules,
  valuesFrom
} from '../fields.js'
import { listPath } from '../view-model/list.js'

const copy = copyFor({ en, cy })
const view = `${TEMPLATES}/features/saved-transporters/add/add`

const typeItems = (selected) =>
  TRANSPORTER_TYPES.map((type) => ({
    value: type,
    text: copy.add.types[type],
    checked: type === selected
  }))

const countryItems = async (selected) => {
  const offered = await countryOptions()
  return [
    { value: '', text: copy.add.countryPlaceholder, selected: !selected },
    ...offered.map((option) => ({
      ...option,
      selected: option.value === selected
    }))
  ]
}

const render = async (h, values = {}, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.add.title, { backLink: listPath() }),
    copy,
    values,
    cancelHref: listPath(),
    types: typeItems(values.transporterType),
    countryItems: await countryItems(values.country),
    errorSummary: kit.errorSummary(errors),
    errors: Object.fromEntries(
      Object.keys(errors).map((field) => [field, kit.fieldError(errors, field)])
    )
  })

const get = async (_request, h) => render(h)

/**
 * Saves a new transporter: this page's own `transporterRules` validate the
 * form first, so an empty or badly-shaped submission never reaches the
 * service and re-renders with `copy.errors` messages. `createTransporter`'s
 * 400 problem stays as a backstop for a rule only the service knows.
 */
const post = async (request, h) => {
  const values = valuesFrom(request.payload)
  const countryCodes = (await countryOptions()).map((option) => option.value)
  const { errors } = validate(transporterRules(countryCodes), values)
  if (errors) {
    return (await render(h, values, errors)).code(HTTP_STATUS_BAD_REQUEST)
  }
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
    return (await render(h, values, formErrorsFor(refused))).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }
}

export const routes = [
  {
    method: 'GET',
    path: '/transporters/add',
    options: kit.routeOptions,
    handler: get
  },
  {
    method: 'POST',
    path: '/transporters/add',
    options: kit.routeOptions,
    handler: post
  }
]
