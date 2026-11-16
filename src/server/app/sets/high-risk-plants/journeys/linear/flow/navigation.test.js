import { SET_BASE } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  nextStepLanding,
  taskRowsOfSection
} from '../../../../../flow/navigation.js'
import { journeySections } from '../../../../../flow/journey-flow.js'
import {
  installHighRiskPlantsJourney,
  PLANTS_OR_WOOD_IN_SCOPE,
  POTATO_IN_SCOPE,
  scopeAnswering,
  scopeOf
} from '../test-support.js'
import { commodityTypePage } from '../features/commodity-type/page.js'
import {
  commoditiesPage,
  commodityDetailsPage
} from '../features/commodities/page.js'
import { originPage } from '../features/origin/page.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { arrivalDetailsPage } from '../features/arrival-details/page.js'
import { placeOfDestinationPage } from '../features/place-of-destination/page.js'
import { consignorPage } from '../features/consignor-select/page.js'
import { identificationNumbersPage } from '../features/identification-numbers/page.js'
import { consignmentContactSelectPage } from '../features/consignment-contact-select/page.js'
import { notificationViewPage } from '../features/check-answers/page.js'

const JOURNEY_ID = 'HRP-0001'

const journeyPath = (page) =>
  `${SET_BASE}/notifications/${JOURNEY_ID}/${page.slug}`

const landingAfter = (page, scope) =>
  nextStepLanding(page.id, scope, JOURNEY_ID)

const nextAfter = (page, scope) => landingAfter(page, scope)?.path

describe('#nextStepLanding — where Save and continue lands', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it.each([
    ['plants or wood', PLANTS_OR_WOOD_IN_SCOPE],
    ['potatoes', POTATO_IN_SCOPE]
  ])(
    'Should walk a %s notification through the journey in order',
    (_, questionsInScope) => {
      const scope = scopeOf(...questionsInScope)
      const visited = []
      for (
        let path = nextAfter(commodityTypePage, scope);
        path;
        path = nextAfter(pageAt(path), scope)
      ) {
        visited.push(path)
      }
      expect(visited).toEqual(
        expectedOrder({ isPotatoes: questionsInScope === POTATO_IN_SCOPE }).map(
          (page) => journeyPath(page)
        )
      )
    }
  )

  it('Should go from the commodities list to origin, never to commodity details', () => {
    expect(
      nextAfter(commoditiesPage, scopeOf(...PLANTS_OR_WOOD_IN_SCOPE))
    ).toBe(journeyPath(originPage))
  })

  it('Should go from the commodities list to origin when the commodity type and country of origin are in scope', () => {
    expect(
      nextAfter(commoditiesPage, scopeOf('commodityType', 'countryOfOrigin'))
    ).toBe(journeyPath(originPage))
  })

  it('Should go from origin to the commodity type page when only the country of origin is saved', () => {
    expect(
      nextAfter(
        originPage,
        scopeAnswering(['countryOfOrigin'], ...PLANTS_OR_WOOD_IN_SCOPE)
      )
    ).toBe(journeyPath(commodityTypePage))
  })

  it('Should go from the place of destination to the commodity type page when no commodity type is saved', () => {
    expect(
      nextAfter(
        placeOfDestinationPage,
        scopeAnswering(['countryOfOrigin'], ...PLANTS_OR_WOOD_IN_SCOPE)
      )
    ).toBe(journeyPath(commodityTypePage))
  })

  it('Should name the unopened page and the missing answer when it lands on the page that asks for it', () => {
    expect(
      landingAfter(
        originPage,
        scopeAnswering(['countryOfOrigin'], ...PLANTS_OR_WOOD_IN_SCOPE)
      ).unopened
    ).toEqual({
      pageId: arrivalStatusPage.id,
      missingAnswerIds: ['commodityType']
    })
  })

  it('Should go from the commodities list to origin when the commodity type is saved and the country of origin is not', () => {
    expect(
      nextAfter(
        commoditiesPage,
        scopeAnswering(['commodityType'], ...PLANTS_OR_WOOD_IN_SCOPE)
      )
    ).toBe(journeyPath(originPage))
  })

  it('Should go from origin to arrival status for plants and wood and to the arrival details for potatoes', () => {
    expect(nextAfter(originPage, scopeOf(...PLANTS_OR_WOOD_IN_SCOPE))).toBe(
      journeyPath(arrivalStatusPage)
    )
    expect(nextAfter(originPage, scopeOf(...POTATO_IN_SCOPE))).toBe(
      journeyPath(arrivalDetailsPage)
    )
  })

  it('Should go from the place of destination to the consignor for plants and wood and to identification numbers for potatoes', () => {
    expect(
      nextAfter(placeOfDestinationPage, scopeOf(...PLANTS_OR_WOOD_IN_SCOPE))
    ).toBe(journeyPath(consignorPage))
    expect(nextAfter(placeOfDestinationPage, scopeOf(...POTATO_IN_SCOPE))).toBe(
      journeyPath(identificationNumbersPage)
    )
  })

  it('Should go from the contact address to nothing, the review page being the fallback', () => {
    expect(
      nextAfter(
        consignmentContactSelectPage,
        scopeOf(...PLANTS_OR_WOOD_IN_SCOPE)
      )
    ).toBeUndefined()
  })

  it('Should go on from commodity details to origin, a sub-page leaving by the journey order', () => {
    expect(
      nextAfter(commodityDetailsPage, scopeOf(...PLANTS_OR_WOOD_IN_SCOPE))
    ).toBe(journeyPath(originPage))
  })

  it('Should refuse a page that belongs to no section', () => {
    expect(() =>
      nextStepLanding(
        'not-a-real-page',
        scopeOf(...PLANTS_OR_WOOD_IN_SCOPE),
        JOURNEY_ID
      )
    ).toThrow(/not in the journey's sections/)
  })

  it('Should answer no next page after the review page, the last in the journey order', () => {
    expect(
      nextAfter(notificationViewPage, scopeOf(...PLANTS_OR_WOOD_IN_SCOPE))
    ).toBeUndefined()
  })
})

describe('#taskRowsOfSection — what Overview lists under a caption', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should list the task rows of every section in the order of their first page', () => {
    expect(
      journeySections()
        .filter((section) => taskRowsOfSection(section).length > 0)
        .map((section) => [
          section.id,
          taskRowsOfSection(section).map((row) => row.id)
        ])
    ).toEqual([
      ['about-the-consignment', ['commodities', 'origin']],
      ['arrival-and-destination', ['arrival', 'destination']],
      ['consignment-parties', ['consignor', 'identificationNumbers', 'contact']]
    ])
  })
})

function pageAt(path) {
  const slug = path.split(`${JOURNEY_ID}/`)[1]
  return journeySections()
    .flatMap((section) => section.pages)
    .find((page) => page.slug === slug)
}

function expectedOrder({ isPotatoes }) {
  return [
    commoditiesPage,
    originPage,
    ...(isPotatoes ? [] : [arrivalStatusPage]),
    arrivalDetailsPage,
    placeOfDestinationPage,
    ...(isPotatoes ? [] : [consignorPage]),
    identificationNumbersPage,
    consignmentContactSelectPage
  ]
}
