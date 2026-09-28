import {
  compose,
  maxText,
  requiredOneOf,
  requiredText
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import * as countries from '../../../../../../services/countries/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

/**
 * The transporter types the add form offers. Journey vocabulary, not part of
 * the transporters service's own contract (`services/transporters/contract.json`
 * only says the field is required, with an `enum`): the labels a form shows
 * for each belong to the release that asks the question.
 */
export const TRANSPORTER_TYPES = Object.freeze(['commercial', 'private'])

const APPROVAL_NUMBER_MAX_LENGTH = 100
const ADDRESS_LINE_2_MAX_LENGTH = 100
const COUNTY_MAX_LENGTH = 100
const POSTCODE_MAX_LENGTH = 12

/** The fields the add form asks for, in its order. Names match the
 * transporters service's own record (`contract.json`'s `record.fields`), so
 * the form posts straight to `createTransporter`. */
export const FIELDS = Object.freeze([
  'name',
  'transporterType',
  'approvalNumber',
  'addressLine1',
  'addressLine2',
  'townOrCity',
  'county',
  'postcode',
  'country'
])

/** What the form sent, for the service and for putting back in the form. */
export const valuesFrom = (payload = {}) =>
  Object.fromEntries(
    FIELDS.map((field) => [field, String(payload[field] ?? '').trim()])
  )

const copy = copyFor({ en, cy })

/**
 * The countries the add form's country select offers, in ISO code:
 * `countries.addressCountries()` (not `originCountries()`, the origin of
 * goods list, which excludes the UK — most of the stub's own transporters
 * are British hauliers). A transporter's address needs the full list a
 * courier could be based in.
 *
 * @returns {Promise<{value: string, text: string}[]>} one entry per
 * country, `value` its ISO 3166-1 alpha-2 code.
 */
export const countryOptions = async () => {
  const names = await countries.addressCountries()
  return Promise.all(
    names.map(async (name) => ({
      value: await countries.countryCodeOf(name),
      text: name
    }))
  )
}

/**
 * The add form's own validation, ahead of the service: every field the
 * service's stub also refuses is caught here first, with this page's own
 * words. `createTransporter`'s 400 problem stays as a backstop for a rule
 * only the service knows (see `isValidationFailure` in
 * `services/transporters/index.js`).
 *
 * @param {readonly string[]} countryCodes - the codes the country select
 * offers, from the countries service.
 */
export const transporterRules = (countryCodes) =>
  compose(
    requiredText('name', copy.errors.name),
    requiredOneOf(
      'transporterType',
      TRANSPORTER_TYPES,
      copy.errors.transporterType
    ),
    maxText(
      'approvalNumber',
      APPROVAL_NUMBER_MAX_LENGTH,
      copy.errors.tooLong.approvalNumber
    ),
    requiredText('addressLine1', copy.errors.addressLine1),
    maxText(
      'addressLine2',
      ADDRESS_LINE_2_MAX_LENGTH,
      copy.errors.tooLong.addressLine2
    ),
    requiredText('townOrCity', copy.errors.townOrCity),
    maxText('county', COUNTY_MAX_LENGTH, copy.errors.tooLong.county),
    maxText('postcode', POSTCODE_MAX_LENGTH, copy.errors.tooLong.postcode),
    requiredOneOf('country', countryCodes, copy.errors.country)
  )

/**
 * The form's errors, in the form's order: the page's own words for each
 * field a service's 400 problem refused, falling back to the service's
 * message. Used only for the stub's backstop refusal — `transporterRules`'s
 * own errors already carry the page's words.
 *
 * @param {Record<string, string>} refused - `mapApiErrorsToFormErrors` of
 * the service's 400 problem.
 * @returns {Record<string, string>} the message for each refused field.
 */
export const formErrorsFor = (refused) =>
  Object.fromEntries(
    FIELDS.filter((field) => refused[field]).map((field) => [
      field,
      copy.errors[field] ?? refused[field]
    ])
  )
