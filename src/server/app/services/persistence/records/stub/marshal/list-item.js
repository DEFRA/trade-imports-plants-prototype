import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { party } from '../../../../address-book/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { SUBMITTED } from '../../../../../engine/persistence/records.js'

const YEAR_DIGITS = 4
const MONTH_DIGITS = 2
const DAY_DIGITS = 2

export const isoFromDateParts = (parts) => {
  const { day, month, year } = parts ?? {}
  if (day == null || month == null || year == null) {
    return null
  }
  return `${String(year).padStart(YEAR_DIGITS, '0')}-${String(month).padStart(MONTH_DIGITS, '0')}-${String(day).padStart(DAY_DIGITS, '0')}`
}

/** Dashboard list names: references resolve from the stub book; inline answers
 * already carry the name. Mirrors `real/marshal/list-item.js`, which resolves the
 * same two names against the real book — the backend stores and returns the
 * reference either way.
 *
 * A submitted row shows the name frozen at submit when it has one, so a later
 * edit to the address book cannot rewrite a submitted record. This journey
 * freezes no name — it stores `{ addressId }` and nothing else — so a submitted
 * reference still resolves from the book rather than reading as no name at all.
 * That is the deliberate divergence from the animals engine, which relies on a
 * set-level freeze at submit that this set has no counterpart for. */
const nameOf = async (answer, status) => {
  if (!answer) {
    return null
  }
  if (status === SUBMITTED && answer.name) {
    return answer.name
  }
  if (answer.addressId) {
    const record = await party(undefined, answer.addressId)
    return record && !record.deleted ? (record.name ?? null) : null
  }
  return answer.name ?? null
}

export const marshalListItem = async (document) => {
  const answers = projectAnswers(decodePersistedFulfilment(document.fulfilment))
  const commodityName = answers.commodityLines?.[0]?.commoditySelection
  const status = document.status

  return {
    journeyId: document.id,
    status,
    createdAt: document.createdAt,
    submittedAt: document.submittedAt,
    concurrencyToken: document.concurrencyToken ?? 0,
    reference: document.id,
    commodity: commodityName ? { name: commodityName } : null,
    originCountryCode: answers.countryOfOrigin ?? null,
    arrivalDate: isoFromDateParts(answers.arrivalDateAtPort),
    consignorName: await nameOf(answers.consignor, status),
    consigneeName: await nameOf(answers.consignee, status),
    // The Late tag beside the dashboard card's status tag (c-030/c-035) reads
    // this straight from the row; the stored system value, never recomputed.
    // The row does `Boolean(journey.lateNotificationIndicator)` and the stored
    // value is the string 'late' or 'on-time' — both truthy — so narrow it to
    // the boolean here rather than tagging every on-time notification late.
    lateNotificationIndicator: answers.lateNotificationIndicator === 'late'
  }
}
