import { SET_BASE } from '../../../set.js'
import { beforeAll, describe, expect, it } from 'vitest'

import {
  journeyRequest,
  expectOneLogged
} from '../../../../../engine/test-support.js'
import { nextTarget, withTrail } from '../../../../../shared/kit.js'
import {
  installHighRiskPlantsJourney,
  PLANTS_OR_WOOD_IN_SCOPE,
  scopeAnswering
} from '../test-support.js'
import { arrivalStatusPage } from '../features/arrival-status/page.js'
import { originPage } from '../features/origin/page.js'

const JOURNEY_ID = 'HRP-0001'

describe('#nextTarget — Save and continue when a required earlier answer is missing', () => {
  beforeAll(() => installHighRiskPlantsJourney())

  it('Should land on the commodity type page with the page saved on the trail, logging the unopened page', () => {
    const request = journeyRequest(JOURNEY_ID, {
      route: { path: `/notifications/{journeyId}/${originPage.slug}` }
    })

    const target = nextTarget(
      request,
      originPage,
      scopeAnswering(['countryOfOrigin'], ...PLANTS_OR_WOOD_IN_SCOPE)
    )

    expect(target).toBe(
      withTrail(`${SET_BASE}/notifications/${JOURNEY_ID}/commodity-type`, [
        originPage.slug
      ])
    )
    expectOneLogged(request.logger, {
      level: 'info',
      fields: {
        journeyId: JOURNEY_ID,
        route: `/notifications/{journeyId}/${originPage.slug}`,
        savedPageId: originPage.id,
        unopenedPageId: arrivalStatusPage.id,
        missingAnswerIds: ['commodityType']
      },
      message:
        'Save and continue opened the page that asks for a missing earlier answer'
    })
  })

  it('Should log nothing when the next page that applies is offered', () => {
    const request = journeyRequest(JOURNEY_ID)

    nextTarget(
      request,
      originPage,
      scopeAnswering(
        ['commodityType', 'countryOfOrigin'],
        ...PLANTS_OR_WOOD_IN_SCOPE
      )
    )

    expect(request.logger.entries).toEqual([])
  })
})
