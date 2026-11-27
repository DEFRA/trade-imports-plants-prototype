import { describe, expect, it } from 'vitest'

import { taskRows } from '../../../flow/task-rows.js'
import { cardAnchorHref, REVIEW_CARDS } from './incomplete-cards.js'

describe('#REVIEW_CARDS', () => {
  it('Should place every task row on exactly one card, so no unfinished card means ready to submit', () => {
    const placed = REVIEW_CARDS.flatMap((card) => card.rows)

    expect([...placed].sort()).toEqual(taskRows.map((row) => row.id).sort())
  })

  it('Should give every card its own anchor', () => {
    const anchors = REVIEW_CARDS.map((card) => card.anchor)

    expect(new Set(anchors).size).toBe(anchors.length)
  })
})

describe('#cardAnchorHref', () => {
  it('Should link a card error to the card on the page', () => {
    expect(cardAnchorHref('arrivalDetails')).toBe('#arrival-details')
  })

  it('Should leave a key that is not a card to the caller', () => {
    expect(cardAnchorHref('countryOfOrigin')).toBeUndefined()
  })
})
