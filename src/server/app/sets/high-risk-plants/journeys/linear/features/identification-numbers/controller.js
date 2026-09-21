import { hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredMaxText,
  maxText,
  pattern,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { identificationNumbersPage as page } from './page.js'
import { IDENTIFICATION_FIELDS, MAX_IDENTIFICATION_LENGTH } from './fields.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: IDENTIFICATION_FIELDS }
const copy = copyFor({ en, cy })
const visibleFields = (scope) =>
  IDENTIFICATION_FIELDS.filter((name) => scope.has(name))
const valuesFrom = (source, scope) =>
  Object.fromEntries(
    visibleFields(scope).map((name) => [name, source[name] ?? ''])
  )
const fields = (scope) =>
  compose(
    ...visibleFields(scope).flatMap((name) =>
      name === 'consignmentNumber'
        ? [
            maxText(
              name,
              MAX_IDENTIFICATION_LENGTH,
              copy.errors[name].maxLength
            ),
            pattern(name, /^\w*$/, copy.errors[name].pattern)
          ]
        : [requiredMaxText(name, MAX_IDENTIFICATION_LENGTH, copy.errors[name])]
    )
  )
const render = (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  return h.view(`${TEMPLATES}/features/identification-numbers/template`, {
    ...kit.base(copy.title, {
      backLink: hubPath(current.journey.journeyId),
      journey: current.journey,
      page,
      recoverableError: options.recoverableError ?? false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    fields: visibleFields(current.scope)
  })
}
const get = async (request, h) => {
  const current = await state.get(request, h)
  return render(h, current, valuesFrom(current.answers, current.scope))
}
const post = async (request, h) => {
  const current = await state.get(request, h)
  const values = valuesFrom(request.payload ?? {}, current.scope)
  const { errors, value } = validate(fields(current.scope), values)
  if (errors) {
    return render(h, current, values, { errors }).code(HTTP_STATUS_BAD_REQUEST)
  }
  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(
        request,
        h,
        valuesFrom(value, current.scope)
      )
    },
    async () =>
      render(h, current, values, { recoverableError: true }).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
  )
  if (failure) {
    return failure
  }
  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}
export const routes = kit.pageRoutes(page, { get, post })
