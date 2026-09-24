import { dashboardPath, hubPath } from '../../../../../../shared/paths.js'
import { TEMPLATES } from '../../config.js'
import * as state from '../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../lib/http-status.js'
import {
  compose,
  requiredOneOf,
  validate
} from '../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import * as commodities from '../../../../services/commodities/index.js'
import { hasCommittedNotificationAnswers } from '../../flow/entry-guard.js'
import { CATEGORY, LINES } from '../commodities/fields.js'
import { originPage as page } from './page.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * Where the consignment comes from.
 *
 * The country list is the whole SPS origin block, but which of those countries
 * this consignment may name is decided by the categories of its commodity
 * lines. That narrowing cannot be an obligation gate — a gate reads its own
 * frame and `category` sits one frame down, on each line — so it is validated
 * here, against the constraints the set-owned commodities service holds.
 */
export const meta = { ...page, collects: ['countryOfOrigin'] }

const view = `${TEMPLATES}/features/origin/template`

const copy = copyFor({ en, cy })

const COUNTRY_FIELD = 'countryOfOrigin'

const countryValues = async () =>
  (await countries.originCountries()).map(({ value }) => value)

// The list feeds a type-ahead that enhances this select, so it carries only
// the placeholder and the real countries — a scroll-only list would need a
// divider rule under the placeholder, a searchable one does not.
const countryItems = async () => [
  { value: '', text: copy.country.placeholder },
  ...(await countries.originCountries())
]

const categoriesOf = (current) =>
  state
    .collectionView(current.answers, [LINES], current.evaluation)
    .map(({ entry }) => entry[CATEGORY])

// Narrowest first, so a consignment that breaks more than one constraint is
// told about the narrowest.
const constraintsOn = (categories) =>
  commodities
    .originConstraints()
    .filter((constraint) =>
      constraint.categories.some((category) => categories.includes(category))
    )

const guidanceOn = (constraints) =>
  constraints
    .map((constraint) => copy.guidance[constraint.id])
    .filter((text) => text !== undefined)

const membershipRule = async () =>
  compose(
    requiredOneOf(
      COUNTRY_FIELD,
      await countryValues(),
      copy.errors.countryRequired
    )
  )

const narrowingErrorFor = (constraints, country) => {
  const failing = constraints.find(
    (constraint) => !constraint.countries.includes(country)
  )
  return failing ? copy.errors.narrowing[failing.id] : undefined
}

/**
 * Both refusals this page can make, as one field error.
 *
 * @param {object} payload - the raw POST payload.
 * @param {readonly object[]} constraints - the origin constraints the
 * consignment's commodity lines put on it.
 * @returns {Promise<object|null>} the field errors, or null when the answer
 * stands.
 */
const errorsFor = async (payload, constraints) => {
  const { errors, value } = validate(await membershipRule(), payload)
  if (errors) {
    return errors
  }
  const narrowing = narrowingErrorFor(constraints, value[COUNTRY_FIELD])
  return narrowing ? { [COUNTRY_FIELD]: narrowing } : null
}

// The back link is the one thing on this page told by what has been saved: a
// notification with nothing saved has no overview worth returning to.
export const originErrors = async (current) =>
  errorsFor(current.answers, constraintsOn(categoriesOf(current)))

const backLinkFor = (journey, answers) =>
  hasCommittedNotificationAnswers(answers)
    ? hubPath(journey.journeyId)
    : dashboardPath()

const render = async (h, current, values, options = {}) => {
  const errors = options.errors ?? {}
  return h.view(view, {
    ...kit.base(copy.title, {
      backLink: backLinkFor(current.journey, current.answers),
      journey: current.journey,
      page,
      recoverableError: options.recoverableError ?? false
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: await countryItems(),
    guidance: guidanceOn(options.constraints ?? [])
  })
}

const isCountryStale = async (code) => {
  if (!code) {
    return false
  }
  const offered = new Set(await countryValues())
  return !offered.has(code)
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const stored = current.answers[COUNTRY_FIELD] ?? ''
  const staleCountry = await isCountryStale(stored)
  return render(
    h,
    current,
    { [COUNTRY_FIELD]: staleCountry ? '' : stored },
    {
      constraints: constraintsOn(categoriesOf(current)),
      errors: staleCountry
        ? { [COUNTRY_FIELD]: copy.errors.countryNoLongerAvailable }
        : {}
    }
  )
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { [COUNTRY_FIELD]: payload[COUNTRY_FIELD] ?? '' }
  const current = await state.get(request, h)
  const constraints = constraintsOn(categoriesOf(current))
  const errors = await errorsFor(payload, constraints)
  if (errors) {
    return (await render(h, current, values, { constraints, errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        [COUNTRY_FIELD]: values[COUNTRY_FIELD].trim()
      })
    },
    async () =>
      (
        await render(h, current, values, {
          constraints,
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
