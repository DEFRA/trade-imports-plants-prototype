import { SET_BASE } from '../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectBackLinkIsPath,
  expectNoRefusalLogged,
  expectOneLogged,
  expectOneSaveFallbackLogged,
  postHandlerOf,
  reviewChangeLinkQuery,
  trailQuery,
  unavailableBackendError
} from '../../../../../../engine/test-support.js'
import {
  dashboardPath,
  hubPath,
  pagePath
} from '../../../../../../shared/paths.js'
import { CYA_SLUG, TRAIL_START } from '../../../../../../shared/kit.js'
import { useInsFrontendBaseUrl } from '../../../../../../../common/test-helpers/use-ins-frontend-base-url.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  itSendsBackToTheDashboardUntilCommodityTypeAnswered,
  itSendsCancelToTheDashboardUntilCommodityTypeAnswered,
  useStubbedHighRiskPlantsJourney
} from '../../test-support.js'
import { commodityTypes } from '../../../../services/commodities/index.js'
import * as commodityType from './controller.js'

const get = commodityType.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(commodityType)

const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const PLANTS_AND_WOOD_HINT =
  'You must notify before arrival, or no later than 4 days after the date of arrival.'
const SELECT_WHAT_YOU_ARE_IMPORTING = 'Select what you are importing'

describe('#meta', () => {
  it('Should own the commodityType obligation on the commodity-type page', () => {
    expect(commodityType.meta).toEqual({
      id: 'commodity-type',
      slug: 'commodity-type',
      maturity: 'exploring',
      collects: ['commodityType']
    })
  })
})

describe('GET commodity-type', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should render the page title and the legend as the page heading', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.pageTitle).toBe('What are you importing?')
    expect(result.view.context.copy.legend).toBe('What are you importing?')
  })

  it('Should caption the page About the consignment', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.caption).toBe('About the consignment')
  })

  it('Should offer every service commodity type with its label and hint', async () => {
    const result = await driveHandler(get)

    expect(
      result.view.context.typeOptions.map((option) => option.value)
    ).toEqual([...commodityTypes()])
    expect(result.view.context.typeOptions).toEqual([
      expect.objectContaining({
        value: POTATOES,
        text: 'Potatoes (seed or ware)',
        hint: {
          text: 'You must notify at least 2 days before the expected date of arrival.'
        }
      }),
      expect.objectContaining({
        value: PLANTS_FOR_PLANTING,
        text: 'Plants for planting',
        hint: { text: PLANTS_AND_WOOD_HINT }
      }),
      expect.objectContaining({
        value: WOOD_AND_CUT_TREES,
        text: 'Wood and cut trees',
        hint: { text: PLANTS_AND_WOOD_HINT }
      })
    ])
  })

  it('Should check nothing and show no error on a notification with no answer', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.values).toEqual({ commodityType: '' })
    expect(
      result.view.context.typeOptions.every((option) => !option.checked)
    ).toBe(true)
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should prefill the stored answer and check its radio', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: PLANTS_FOR_PLANTING }
    })

    expect(result.view.context.values).toEqual({
      commodityType: PLANTS_FOR_PLANTING
    })
    expect(
      result.view.context.typeOptions.filter((option) => option.checked)
    ).toEqual([
      expect.objectContaining({ value: PLANTS_FOR_PLANTING, checked: true })
    ])
  })

  itSendsBackToTheDashboardUntilCommodityTypeAnswered(get)
  itSendsCancelToTheDashboardUntilCommodityTypeAnswered(get)

  describe('where Back goes by where the trader came from', () => {
    const setInsFrontendBaseUrl = useInsFrontendBaseUrl()
    const answered = { commodityType: PLANTS_FOR_PLANTING }

    it.each([
      ['no answer', {}],
      ['an answer', answered]
    ])(
      'Should send Back to the dashboard for a notification started from the dashboard with %s',
      async (_state, seed) => {
        const result = await driveHandler(get, {
          seed,
          query: trailQuery(TRAIL_START.dashboard)
        })

        expectBackLinkIsPath(result, dashboardPath())
      }
    )

    it.each([
      ['no answer', {}],
      ['an answer', answered]
    ])(
      'Should send Back to the Import Notification Service type question for a notification started there with %s',
      async (_state, seed) => {
        setInsFrontendBaseUrl('http://ins.example/')

        const result = await driveHandler(get, {
          seed,
          query: trailQuery(TRAIL_START.ins)
        })

        expectBackLinkIsPath(result, 'http://ins.example/notification-type')
      }
    )

    it('Should send Back to Overview when opened from Overview', async () => {
      const result = await driveHandler(get, {
        seed: answered,
        query: trailQuery(TRAIL_START.overview)
      })

      expectBackLinkIsPath(result, hubPath(result.journeyId))
    })

    it('Should send Back to the review when opened from a Change link', async () => {
      const result = await driveHandler(get, {
        seed: answered,
        query: reviewChangeLinkQuery()
      })

      expectBackLinkIsPath(result, pagePath(result.journeyId, CYA_SLUG))
    })

    it('Should send Back to the dashboard with no answer and a trail naming a place the journey does not have', async () => {
      const result = await driveHandler(get, {
        query: trailQuery('not-a-place')
      })

      expectBackLinkIsPath(result, dashboardPath())
    })
  })
})

describe('POST commodity-type — a rejected answer', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should answer 400 for a blank choice, committing nothing', async () => {
    const result = await driveHandler(post, { payload: { commodityType: '' } })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.after).toEqual(result.before)
    expectNoRefusalLogged(result.logger)
  })

  it('Should answer 400 for a value the service does not offer', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: 'bulbs' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should re-render the raw entered value and summarise the error', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: 'bulbs' }
    })

    expect(result.view.context.values).toEqual({ commodityType: 'bulbs' })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_WHAT_YOU_ARE_IMPORTING, href: '#commodityType' }
    ])
  })

  it('Should leave the saved lines exactly as they were', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: 'bulbs' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after.commodityLines).toEqual(
      COMPLETE_POTATO_CONSIGNMENT.commodityLines
    )
  })

  it('Should refuse no choice on Save and return to overview, keep the lines and save nothing', async () => {
    const { commodityLines } = COMPLETE_POTATO_CONSIGNMENT
    const result = await driveHandler(post, {
      seed: { commodityLines },
      payload: { exit: 'hub' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.view.context.hasLines).toBe(true)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a value the service does not offer on Save and return to overview', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: 'bulbs', exit: 'hub' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.commodityType).toBe(
      SELECT_WHAT_YOU_ARE_IMPORTING
    )
    expect(result.after).toEqual(result.before)
  })
})

describe('POST commodity-type — an accepted answer', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should commit exactly the chosen type', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: WOOD_AND_CUT_TREES, crumb: 'token' }
    })

    expect(result.after).toEqual({ commodityType: WOOD_AND_CUT_TREES })
  })

  it('Should redirect to the commodities list', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: POTATOES }
    })

    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/commodities?from=commodity-type`
    })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      payload: { commodityType: POTATOES, exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual({ commodityType: POTATOES })
  })
})

describe('POST commodity-type — changing the type of a consignment with lines', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should drop every line whose category the new type does not hold', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: WOOD_AND_CUT_TREES }
    })

    expect(result.after.commodityType).toBe(WOOD_AND_CUT_TREES)
    expect(result.after.commodityLines ?? []).toEqual([])
  })

  it('Should report the count on the commodities list it redirects to, with the commodity type on the trail', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: PLANTS_FOR_PLANTING }
    })

    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/commodities?removed=1&from=commodity-type`
    })
  })

  it('Should keep every line and redirect as usual when the type is unchanged', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: POTATOES }
    })

    expect(result.after.commodityLines).toEqual(
      COMPLETE_POTATO_CONSIGNMENT.commodityLines
    )
    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/commodities?from=commodity-type`
    })
  })

  it('Should carry the trail through the redirect', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: WOOD_AND_CUT_TREES },
      query: reviewChangeLinkQuery()
    })

    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/commodities?removed=1&from=notification-view%2Ccommodity-type`
    })
  })

  it('Should remove the lines the new type does not hold and open the commodities list reporting them when Save and return to overview was pressed', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: WOOD_AND_CUT_TREES, exit: 'hub' }
    })

    expect(result.response).toEqual({
      redirect: `${SET_BASE}/notifications/${result.journeyId}/commodities?removed=1&from=commodity-type`
    })
    expect(result.after.commodityLines ?? []).toEqual([])
  })

  it('Should log the removal once with the number of lines', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { commodityType: WOOD_AND_CUT_TREES, exit: 'hub' }
    })

    expectOneLogged(result.logger, {
      level: 'info',
      fields: { journeyId: result.journeyId, removed: 1 },
      message: 'Commodity lines removed by a commodity type change'
    })
  })
})

describe('GET commodity-type — a consignment with lines', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should warn on the page while the consignment holds lines', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_POTATO_CONSIGNMENT
    })

    expect(result.view.context.hasLines).toBe(true)
  })

  it('Should not warn while the consignment holds none', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.hasLines).toBe(false)
  })
})

describe('POST commodity-type — save failures', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      saveFailure: failure,
      payload: { commodityType: POTATOES }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ commodityType: POTATOES })
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure
    })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    await expect(
      driveHandler(post, {
        payload: { commodityType: POTATOES },
        saveFailure: new TypeError('programming failure')
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
