import { SET_BASE } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { nextInTaskRow } from '../../../../../flow/navigation.js'
import { installHighRiskPlantsJourney } from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'

const JOURNEY_ID = 'HRP-0001'

const PLANTS_RUN = [
  'commodityType',
  'commodityLines',
  'countryOfOrigin',
  'arrivalStatus',
  'arrivalDate',
  'placeOfDestination',
  'consignor',
  'consignmentNumber',
  'contactAddress'
]

const scopeOf = (...names) => ({
  inScope: new Set(names),
  answered: () => true
})

const journeyPath = (slug) => `${SET_BASE}/notifications/${JOURNEY_ID}/${slug}`
const HUB = `${SET_BASE}/notifications/${JOURNEY_ID}`

describe('#nextInTaskRow — where a save outside the opening run goes', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should carry the entry question on to the commodities list, the next page of its task', () => {
    expect(
      nextInTaskRow(commodityTypePage.id, scopeOf(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(journeyPath(commoditiesPage.slug))
  })

  it('Should return the commodities list to the overview', () => {
    expect(
      nextInTaskRow(commoditiesPage.id, scopeOf(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(HUB)
  })

  it('Should carry arrival status on to the arrival details, the next page of its task', () => {
    expect(
      nextInTaskRow(arrivalStatusPage.id, scopeOf(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(journeyPath(arrivalDetailsPage.slug))
  })

  it('Should return the arrival details to the overview, not on to the place of destination', () => {
    expect(
      nextInTaskRow(arrivalDetailsPage.id, scopeOf(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(HUB)
  })

  it('Should return the consignor to the overview rather than on to identification numbers, a task of its own', () => {
    const scope = scopeOf(...PLANTS_RUN, 'identificationNumbers')
    expect(nextInTaskRow(consignorPage.id, scope, JOURNEY_ID)).toBe(HUB)
  })

  it('Should keep check your answers leading on to the declaration — it belongs to no task row', () => {
    const scope = {
      ...scopeOf(...PLANTS_RUN, 'declaration'),
      readyForCheckYourAnswers: true
    }
    expect(nextInTaskRow(notificationViewPage.id, scope, JOURNEY_ID)).toBe(
      journeyPath('declaration')
    )
  })
})
