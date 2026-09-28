import { projectAnswers } from '../../app/bridge/fulfilments/index.js'

const YEAR_DIGITS = 4
const DAY_OR_MONTH_DIGITS = 2

/** `{ day: 3, month: 10, year: 2026 }` as `2026-10-03`, or null. */
export const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) {
    return null
  }
  const pad = (value, digits) => String(value).padStart(digits, '0')
  return `${pad(year, YEAR_DIGITS)}-${pad(month, DAY_OR_MONTH_DIGITS)}-${pad(day, DAY_OR_MONTH_DIGITS)}`
}

/**
 * The dashboard's Commodity and Arrival columns, filled in from a
 * notification's own answers.
 *
 * The real list marshaller (`records/stub/marshal/list-item.js`, owned by
 * plants-frontend) reads `commodityLines[0].commoditySelection` and
 * `arrivalDateAtPort`, which the plants pages never save: they save
 * `commodityType` and `arrivalDate`. So every row comes back with no
 * commodity and no arrival date, in the real journey too, and a release's
 * commodity and date filters could never match. A design release fills the
 * two gaps here, so its dashboard shows the columns and its filters work.
 * Needs a real service: the real marshaller has to read the answers the
 * pages save (logged for the plants-frontend team).
 */

/** `wood-and-cut-trees` as `Wood and cut trees`. */
export const commodityTypeName = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }
  const words = value.trim().replaceAll('-', ' ')
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}`
}

const needsFilling = (row) => !row.commodity || !row.arrivalDate

/**
 * One row with its missing Commodity and Arrival filled from the answers.
 * A column the row already has is never changed.
 */
export const fillFromAnswers = (row, answers = {}) => {
  const name = commodityTypeName(answers.commodityType)
  const arrival = isoFromDateParts(answers.arrivalDate)
  return {
    ...row,
    commodity: row.commodity ?? (name ? { name } : null),
    arrivalDate: row.arrivalDate ?? arrival
  }
}

const answersFromRecord = async (records, journeyId) => {
  try {
    const record = await records.load({ journeyId })
    return record?.fulfilment ? projectAnswers(record.fulfilment) : {}
  } catch {
    return {}
  }
}

/**
 * Every row with its missing columns filled, reading each notification that
 * lacks one through the store's own `load`.
 *
 * @param {object} records - the upstream records store.
 * @param {object[]} rows - the rows its `list` answered.
 * @param {object} [options]
 * @param {Function} [options.answersOf] - `(records, journeyId) => answers`
 * (tests).
 */
export const withDerivedColumns = async (
  records,
  rows,
  { answersOf = answersFromRecord } = {}
) =>
  Promise.all(
    rows.map(async (row) =>
      needsFilling(row)
        ? fillFromAnswers(row, await answersOf(records, row.journeyId))
        : row
    )
  )
