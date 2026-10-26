import { describe, expect, it } from 'vitest'

import {
  PLANTS_WOOD_DAYS_AFTER_ARRIVAL,
  POTATO_DAYS_BEFORE_ARRIVAL
} from '../timing-windows.js'
import { lateRuleText } from './late-rule.js'

const lateCopy = {
  potatoes: (days) => `potatoes ${days}`,
  plantsAndWood: (days) => `plants and wood ${days}`
}

describe('#lateRuleText', () => {
  it('Should word the potato rule with the days before arrival for potatoes', () => {
    expect(lateRuleText('potatoes', lateCopy)).toBe(
      `potatoes ${POTATO_DAYS_BEFORE_ARRIVAL}`
    )
  })

  it.each(['plants-for-planting', 'wood-and-cut-trees'])(
    'Should word the plants and wood rule with the days after arrival for %s',
    (commodityType) => {
      expect(lateRuleText(commodityType, lateCopy)).toBe(
        `plants and wood ${PLANTS_WOOD_DAYS_AFTER_ARRIVAL}`
      )
    }
  )
})
