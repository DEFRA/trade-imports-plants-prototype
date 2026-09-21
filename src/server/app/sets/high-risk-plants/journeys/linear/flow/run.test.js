import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { beforeAll, describe, expect, it } from 'vitest'

import { installHighRiskPlantsJourney } from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import { commoditiesPage } from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'
import { RUN_STEPS, nextRunTarget } from './run.js'

const JOURNEY_ID = 'HRP-0001'

// The whole opening run for a plants or wood notification: no time and no
// place of landing, which are potato matters, and no status for potatoes,
// whose commodity type puts it out of scope. The arrival date is in both.
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
const POTATO_RUN = [
  'commodityType',
  'commodityLines',
  'countryOfOrigin',
  'arrivalDate',
  'arrivalTime',
  'proposedPlaceOfLanding',
  'placeOfDestination',
  'consignmentNumber',
  'contactAddress'
]

const scopeOf = (...names) => ({
  inScope: new Set(names),
  answered: () => true
})

const answering = (...names) => ({
  inScope: new Set(names),
  answered: (id) => names.includes(id)
})

describe('#RUN_STEPS — the opening run', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should open on commodity-type, then commodities, origin, arrival status, arrival details and the destination', () => {
    expect(RUN_STEPS.map((step) => step.id)).toEqual([
      commodityTypePage.id,
      commoditiesPage.id,
      originPage.id,
      arrivalStatusPage.id,
      arrivalDetailsPage.id,
      placeOfDestinationPage.id,
      consignorPage.id,
      identificationNumbersPage.id,
      consignmentContactSelectPage.id
    ])
  })

  it('Should target the commodity-type page while its gate passes', () => {
    expect(RUN_STEPS[0].target(scopeOf('commodityType'), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/commodity-type`
    )
  })

  it('Should target the commodities page once a commodity type is answered', () => {
    expect(
      RUN_STEPS[1].target(
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/commodities`)
  })

  it('Should target the origin page once a commodity type is answered', () => {
    expect(
      RUN_STEPS[2].target(
        answering('commodityType', 'countryOfOrigin'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/origin`)
  })

  it('Should skip a step whose gate fails', () => {
    expect(RUN_STEPS[0].target(scopeOf(), JOURNEY_ID)).toBeNull()
  })

  it('Should skip the commodities page while the entry question is unanswered', () => {
    expect(
      RUN_STEPS[1].target(answering('commodityLines'), JOURNEY_ID)
    ).toBeNull()
  })

  it('Should skip the origin page while the entry question is unanswered', () => {
    expect(
      RUN_STEPS[2].target(
        answering('commodityLines', 'countryOfOrigin'),
        JOURNEY_ID
      )
    ).toBeNull()
  })

  it('Should target the arrival-status page for a plants or wood notification', () => {
    expect(RUN_STEPS[3].target(answering(...PLANTS_RUN), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/arrival-status`
    )
  })

  it('Should skip the arrival-status page for a potato notification', () => {
    // arrivalStatus is out of scope for potatoes, so the derived gate fails
    // and the step is passed over rather than shown and left unanswerable.
    expect(RUN_STEPS[3].target(answering(...POTATO_RUN), JOURNEY_ID)).toBeNull()
  })

  it('Should skip the arrival-status page while the origin is unanswered', () => {
    // arrivalStatus is in scope here, so the null can only come from the
    // derived countryOfOrigin prerequisite the page inherits by sitting
    // after origin in flow.js.
    expect(
      RUN_STEPS[3].target(
        answering('commodityType', 'commodityLines', 'arrivalStatus'),
        JOURNEY_ID
      )
    ).toBeNull()
  })

  it('Should skip the arrival-details page while the origin is unanswered', () => {
    // arrivalDate is in scope here, so the null can only come from the derived
    // countryOfOrigin prerequisite the page inherits by sitting after origin.
    expect(
      RUN_STEPS[4].target(
        answering('commodityType', 'commodityLines', 'arrivalDate'),
        JOURNEY_ID
      )
    ).toBeNull()
  })

  it('Should target the arrival-details page for every commodity type', () => {
    expect(RUN_STEPS[4].target(answering(...PLANTS_RUN), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/arrival-details`
    )
    expect(RUN_STEPS[4].target(answering(...POTATO_RUN), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/arrival-details`
    )
  })

  it('Should close the run on the place of destination for every commodity type', () => {
    expect(RUN_STEPS[5].target(answering(...PLANTS_RUN), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/destinations/select`
    )
    expect(RUN_STEPS[5].target(answering(...POTATO_RUN), JOURNEY_ID)).toBe(
      `/notifications/${JOURNEY_ID}/destinations/select`
    )
  })

  it('Should skip the place of destination while the origin is unanswered', () => {
    // placeOfDestination is in scope here, so the null can only come from the
    // derived countryOfOrigin prerequisite the page inherits by sitting after
    // origin in flow.js.
    expect(
      RUN_STEPS[5].target(
        answering('commodityType', 'commodityLines', 'placeOfDestination'),
        JOURNEY_ID
      )
    ).toBeNull()
  })
})

describe('#nextRunTarget', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should send the entry question on to the commodities list', () => {
    expect(
      nextRunTarget(
        commodityTypePage.id,
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/commodities`)
  })

  it('Should send the commodities list on to origin', () => {
    expect(
      nextRunTarget(
        commoditiesPage.id,
        answering('commodityType', 'commodityLines', 'countryOfOrigin'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/origin`)
  })

  it('Should send origin on to arrival status for a plants or wood notification', () => {
    expect(
      nextRunTarget(originPage.id, answering(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(`/notifications/${JOURNEY_ID}/arrival-status`)
  })

  it('Should send origin past arrival status to the details for a potato notification', () => {
    expect(
      nextRunTarget(originPage.id, answering(...POTATO_RUN), JOURNEY_ID)
    ).toBe(`/notifications/${JOURNEY_ID}/arrival-details`)
  })

  it('Should send arrival status on to the arrival details', () => {
    expect(
      nextRunTarget(arrivalStatusPage.id, answering(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(`/notifications/${JOURNEY_ID}/arrival-details`)
  })

  it('Should send the arrival details on to the place of destination', () => {
    expect(
      nextRunTarget(arrivalDetailsPage.id, answering(...PLANTS_RUN), JOURNEY_ID)
    ).toBe(`/notifications/${JOURNEY_ID}/destinations/select`)
  })

  it("Should fall through to the overview after the run's last step", () => {
    expect(
      nextRunTarget(
        consignmentContactSelectPage.id,
        answering(...PLANTS_RUN),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should fall through to the overview when the last step is out of scope', () => {
    expect(
      nextRunTarget(
        commoditiesPage.id,
        answering('commodityType', 'commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should fall through to the overview while the entry question is unanswered', () => {
    expect(
      nextRunTarget(
        commodityTypePage.id,
        answering('commodityLines'),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}`)
  })

  it('Should decline a step id the run does not hold', () => {
    expect(
      nextRunTarget('not-a-step', scopeOf('commodityType'), JOURNEY_ID)
    ).toBeNull()
  })
})

describe('consignor opening-run step', () => {
  beforeAll(installHighRiskPlantsJourney)
  it('Should follow destination for plants and wood and skip it for potatoes', () => {
    expect(
      nextRunTarget(
        placeOfDestinationPage.id,
        answering(...PLANTS_RUN),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/consignors/select`)
    expect(
      nextRunTarget(
        placeOfDestinationPage.id,
        answering(...POTATO_RUN),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/identification-numbers`)
  })
})

it('Should send every commodity type from identification numbers to contact', () => {
  installHighRiskPlantsJourney()
  for (const names of [PLANTS_RUN, POTATO_RUN]) {
    expect(
      nextRunTarget(
        identificationNumbersPage.id,
        answering(...names),
        JOURNEY_ID
      )
    ).toBe(`/notifications/${JOURNEY_ID}/consignment/contact/select`)
  }
})
