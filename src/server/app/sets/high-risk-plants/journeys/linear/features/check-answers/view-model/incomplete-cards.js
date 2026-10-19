import { rowReady } from '../../../../../../../flow/section-status.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import { rowParts, rowStatus, taskRowById } from '../../../flow/task-rows.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

// A row is finished when `rowReady` says so — literally the predicate
// `readyForCheckYourAnswers` applies, imported rather than restated, so a
// notification with no unfinished card is exactly a notification that is ready
// to submit and the two cannot diverge.

/**
 * The review page's cards in page order, each with the task rows whose answers
 * it shows and the id the error summary links to.
 *
 * Every task row appears exactly once — `incomplete-cards.test.js` pins that —
 * so "no unfinished card" and `scope.readyForCheckYourAnswers` are the same
 * verdict.
 *
 * The commodities entry is the one entry whose anchor is not a card. Commodity
 * cards are built one per commodity line and carry no `id`, so `decorateCard`
 * never reaches them: the entry names the outstanding work without marking a
 * card, and anchors to the heading of the section those answers live in, which
 * always stands.
 *
 * The consignor card is the one entry whose card is conditional: it is built
 * only while the consignor is in scope, and while it is out of scope its task
 * row is NA, so `incompleteCardErrors` never names a card that is not on the
 * page.
 */
export const REVIEW_CARDS = [
  { id: 'importDetails', anchor: 'import-details', rows: ['origin'] },
  {
    id: 'commodities',
    anchor: 'about-the-consignment',
    rows: ['commodities']
  },
  { id: 'arrivalDetails', anchor: 'arrival-details', rows: ['arrival'] },
  {
    id: 'placeOfDestination',
    anchor: 'place-of-destination',
    rows: ['destination']
  },
  { id: 'consignor', anchor: 'consignor', rows: ['consignor'] },
  {
    id: 'identificationNumbers',
    anchor: 'identification-numbers',
    rows: ['identificationNumbers']
  },
  { id: 'contact', anchor: 'contact', rows: ['contact'] }
]

const cardById = new Map(REVIEW_CARDS.map((card) => [card.id, card]))

const cardUnfinished = (card, { answers, scope, evaluation }) =>
  card.rows.some(
    (rowId) =>
      !rowReady(
        rowStatus(taskRowById(rowId), answers, scope.inScope, evaluation)
      )
  )

const cardCovered = (card, coveredKeys) =>
  card.rows.some((rowId) =>
    rowParts(taskRowById(rowId)).some((part) => coveredKeys.includes(part))
  )

/**
 * The cards that still have answers outstanding, in page order. A card that
 * shows a field already named by a field or party error is not named twice:
 * pass those keys as `coveredKeys`.
 *
 * @param {object} current - the journey state: `answers`, `scope` (`inScope`
 *   is the pathKey Set) and the request-level `evaluation`.
 * @param {string[]} [coveredKeys] - fields already named by another error.
 * @returns {object} map of card id to message. Empty means nothing is missing.
 */
export const incompleteCardErrors = (current, coveredKeys = []) =>
  Object.fromEntries(
    REVIEW_CARDS.filter(
      (card) => !cardCovered(card, coveredKeys) && cardUnfinished(card, current)
    ).map((card) => [card.id, copy.errors.cards[card.id]])
  )

/** The in-page target for a card error, or undefined for a key that is not a
 * card — which is how the error summary tells the two kinds of entry apart. */
export const cardAnchorHref = (key) => {
  const card = cardById.get(key)
  return card ? `#${card.anchor}` : undefined
}

/** The anchor of a card or section heading the error summary may link to. */
export const anchorOf = (id) => cardById.get(id)?.anchor

const decorateCard = (card, cardErrors) => {
  const known = cardById.get(card.id)
  if (!known) {
    return card
  }
  return { ...card, anchor: known.anchor, error: cardErrors[card.id] ?? null }
}

/** Give every card its anchor, and the unfinished ones their own message. The
 * decoration is a pass over the built sections rather than another argument
 * threaded through every card factory. */
export const withCardErrors = (sections, cardErrors = {}) =>
  sections.map((section) => ({
    ...section,
    cards: section.cards.map((card) => decorateCard(card, cardErrors))
  }))
