import {
  requiredIntegerInRange,
  requiredMaxText,
  requiredOneOf
} from '../../../../../../lib/validate/index.js'
import * as commodities from '../../../../services/commodities/index.js'
import { CATEGORY, GENUS, POTATO_VARIETY, QUANTITY } from './fields.js'

const MAX_TEXT_LENGTH = 58
const MAX_TREATMENT_LENGTH = 400
const MIN_QUANTITY = 1

// The cap each free-text field validates against. The number reaches the error
// sentence as an argument, so it is written here and nowhere else.
const MAX_LENGTH_BY_FIELD = {
  species: MAX_TEXT_LENGTH,
  commodityCode: MAX_TEXT_LENGTH,
  [POTATO_VARIETY]: MAX_TEXT_LENGTH,
  potatoIntendedUse: MAX_TEXT_LENGTH,
  eppoCode: MAX_TEXT_LENGTH,
  sizeOfTree: MAX_TEXT_LENGTH,
  phytosanitaryTreatments: MAX_TREATMENT_LENGTH
}

const WIDGET_BY_FIELD = {
  [GENUS]: 'select',
  phytosanitaryTreatments: 'textarea'
}

const SHORT_INPUT = 'govuk-input--width-10'
const TWO_THIRDS = 'govuk-!-width-two-thirds'

const CLASSES_BY_FIELD = {
  species: TWO_THIRDS,
  commodityCode: SHORT_INPUT,
  [QUANTITY]: SHORT_INPUT,
  [POTATO_VARIETY]: 'govuk-!-width-one-half',
  potatoIntendedUse: TWO_THIRDS,
  eppoCode: SHORT_INPUT,
  sizeOfTree: SHORT_INPUT
}

const INPUTMODE_BY_FIELD = {
  [QUANTITY]: 'numeric'
}

export const widgetOf = (field) => WIDGET_BY_FIELD[field] ?? 'input'

export const inputmodeOf = (field) => INPUTMODE_BY_FIELD[field]

export const classesOf = (field) => CLASSES_BY_FIELD[field]

export const maxLengthOf = (field) => MAX_LENGTH_BY_FIELD[field]

const textRule = (field, copy) => {
  const max = MAX_LENGTH_BY_FIELD[field]
  return requiredMaxText(field, max, {
    required: copy.errors[field].required,
    maxLength: copy.errors[field].maxLength(max)
  })
}

/**
 * The validation rule for one per-line field. Genus is membership of the
 * category's own genus list, quantity is a whole number of at least one, and
 * every other field is capped free text.
 *
 * @param {string} field - the per-line field name.
 * @param {string} category - the category the line is being saved as.
 * @param {object} copy - the resolved `details` copy bundle.
 * @returns {object} a Joi schema for that one field.
 */
export const ruleFor = (field, category, copy) => {
  if (field === GENUS) {
    return requiredOneOf(
      GENUS,
      commodities.generaFor(category),
      copy.errors.genus
    )
  }
  if (field === QUANTITY) {
    return requiredIntegerInRange(QUANTITY, {
      min: MIN_QUANTITY,
      messages: {
        required: copy.errors.quantity.required,
        invalid: copy.errors.quantity.invalid
      }
    })
  }
  return textRule(field, copy)
}

/**
 * The raw submitted value of every field a line of this category is asked
 * for, so an error render shows back exactly what was typed.
 *
 * @param {object} source - the payload, or a stored entry.
 * @param {string[]} fields - the field names in page order.
 * @returns {object} field name to raw string.
 */
export const valuesOf = (source, fields) =>
  Object.fromEntries(
    fields.map((field) => [field, String(source?.[field] ?? '')])
  )

/**
 * The entry to store: the category plus the cleaned value of every field that
 * category asks for, and nothing else. Helper form fields never reach the
 * answers tree.
 *
 * @param {string} category - the validated category.
 * @param {string[]} fields - the field names the category asks for.
 * @param {object} cleaned - the validator's cleaned payload.
 * @returns {object} the collection entry.
 */
export const entryOf = (category, fields, cleaned) => ({
  [CATEGORY]: category,
  ...Object.fromEntries(fields.map((field) => [field, cleaned[field]]))
})
