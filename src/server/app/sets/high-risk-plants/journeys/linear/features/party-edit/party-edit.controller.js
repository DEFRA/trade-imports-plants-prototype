import { pagePath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import { validate } from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { addressBookCountries } from '../../../../../../services/countries/index.js'
import { PARTIES } from '../../parties/index.js'
import {
  addressRules,
  FIELDS,
  formValuesOf,
  partyFrom
} from './address-rules.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const view = `${TEMPLATES}/features/party-edit/party-edit`

const copy = copyFor({ en, cy })

/** A closed list, not a free path: `return` arrives in the query string. */
const RETURN_SLUGS = [kit.CYA_SLUG, ...PARTIES.map((party) => party.slug)]

const returnHref = (request, party) => {
  const slug = RETURN_SLUGS.includes(request.query.return)
    ? request.query.return
    : party.slug
  return kit.withChangeContext(
    request,
    pagePath(request.params.journeyId, slug)
  )
}

const pickerHref = (request, journeyId, party) =>
  kit.withChangeContext(request, pagePath(journeyId, party.slug))

const countryItemsOf = (countries) => [
  { value: '', text: copy.countryPlaceholder },
  ...countries.map(({ code, name }) => ({ value: code, text: name }))
]

const render = async (
  request,
  h,
  journey,
  party,
  { values, errors = {}, recoverableError = false }
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: returnHref(request, party),
      journey,
      recoverableError
    }),
    copy,
    partyTitle: party.title,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItemsOf(await addressBookCountries())
  })

const valuesFrom = (payload = {}) =>
  Object.fromEntries(FIELDS.map((field) => [field, payload[field] ?? '']))

/** A consignor dropped by a change of commodity type has nothing to edit. */
const editable = ({ answers, scope }, party) =>
  scope.has(party.id) && Boolean(answers[party.id])

const get = (party) => async (request, h) => {
  const current = await state.get(request, h)
  if (!editable(current, party)) {
    return h.redirect(pickerHref(request, current.journey.journeyId, party))
  }
  return render(request, h, current.journey, party, {
    values: formValuesOf(current.answers[party.id])
  })
}

const post = (party) => async (request, h) => {
  const payload = request.payload ?? {}
  if (payload.cancel) {
    return h.redirect(returnHref(request, party))
  }

  const current = await state.get(request, h)
  const { journey } = current
  if (!editable(current, party)) {
    return h.redirect(pickerHref(request, journey.journeyId, party))
  }

  const values = valuesFrom(payload)
  const countries = await addressBookCountries()
  const { errors, value } = validate(
    addressRules(countries.map(({ code }) => code)),
    values
  )
  if (errors) {
    return (await render(request, h, journey, party, { values, errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { failure } = await kit.recoverableSave(
    async () => {
      await state.commit(request, h, { [party.id]: partyFrom(value) })
    },
    async () =>
      (
        await render(request, h, journey, party, {
          values,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(returnHref(request, party))
}

export const routes = PARTIES.flatMap((party) =>
  kit.pageRoutes(
    { slug: party.editSlug },
    { get: get(party), post: post(party) }
  )
)
