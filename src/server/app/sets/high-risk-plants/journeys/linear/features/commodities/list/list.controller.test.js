import { describe, expect, it } from 'vitest'

import {
  driveHandler,
  expectNoRefusalLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  postHandlerOf,
  reviewChangeLinkQuery,
  trailQuery,
  unavailableBackendError
} from '../../../../../../../engine/test-support.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import {
  CYA_SLUG,
  TRAIL_START,
  withTrail
} from '../../../../../../../shared/kit.js'
import { originPage } from '../../origin/page.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  itSendsBackToWhereTheTraderCameFrom,
  useStubbedHighRiskPlantsJourney
} from '../../../test-support.js'
import * as list from './list.controller.js'

const get = list.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(list)

const POTATOES = 'potatoes'
const ADD_AT_LEAST_ONE = 'Add at least one commodity'
const LIST_SLUG = 'commodities'
const COMMODITY_TYPE_SLUG = 'commodity-type'
const DETAILS_SLUG = 'commodities/details'

const TWO_LINES = {
  commodityType: POTATOES,
  commodityLines: [
    ...COMPLETE_POTATO_CONSIGNMENT.commodityLines,
    {
      category: 'ware-potatoes',
      potatoVariety: 'King Edward',
      quantity: '80',
      potatoIntendedUse: 'Fresh sale'
    }
  ]
}

describe('#meta', () => {
  it('Should own the commodityLines group on the commodities page', () => {
    expect(list.meta).toEqual({
      id: 'commodities',
      slug: 'commodities',
      maturity: 'exploring',
      collects: ['commodityLines']
    })
  })
})

describe('GET commodities', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should send a consignment with no line straight to the entry page', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, DETAILS_SLUG)
    )
  })

  it('Should read every saved line back with its change and remove controls', async () => {
    const result = await driveHandler(get, { seed: TWO_LINES })

    expect(result.view.context.rows).toEqual([
      expect.objectContaining({
        index: 0,
        position: 1,
        category: 'Seed potatoes',
        genusOrVariety: 'Maris Piper',
        quantity: '250',
        removeAction: 'remove:0'
      }),
      expect.objectContaining({
        index: 1,
        position: 2,
        category: 'Ware potatoes',
        genusOrVariety: 'King Edward',
        quantity: '80',
        removeAction: 'remove:1'
      })
    ])
    expect(result.view.context.rows[1].changeHref).toBe(
      `${pagePath(result.journeyId, DETAILS_SLUG)}?index=1`
    )
    expect(result.view.context.addAnotherHref).toBe(
      pagePath(result.journeyId, DETAILS_SLUG)
    )
  })

  it('Should show a plants line by its genus label rather than its code', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityType: 'plants-for-planting',
        commodityLines: [{ category: 'plants-for-planting', genus: 'Picea' }]
      }
    })

    expect(result.view.context.rows[0].genusOrVariety).toBe('Picea (spruce)')
  })

  it('Should report a removal and stay put even with nothing left to show', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES },
      query: { removed: '2' }
    })

    expect(result.view.context.removedMessage).toBe(
      'We removed 2 commodities that are not Potatoes (seed or ware)'
    )
    expect(result.view.context.rows).toEqual([])
  })

  it.each(['lots', '0', '-3', '1.5', ''])(
    'Should ignore the removal count %j, which is not a positive whole number',
    async (removed) => {
      const result = await driveHandler(get, {
        seed: TWO_LINES,
        query: { removed }
      })

      expect(result.view.context.removedMessage).toBeNull()
    }
  )

  itSendsBackToWhereTheTraderCameFrom(get, {
    seed: TWO_LINES,
    previousPage: COMMODITY_TYPE_SLUG
  })

  it('Should send Back to the previous page on the trail, carrying the rest of the trail', async () => {
    const result = await driveHandler(get, {
      seed: TWO_LINES,
      query: trailQuery(TRAIL_START.overview, COMMODITY_TYPE_SLUG)
    })

    expect(result.view.context.backLink).toBe(
      withTrail(pagePath(result.journeyId, COMMODITY_TYPE_SLUG), [
        TRAIL_START.overview
      ])
    )
  })
})

describe('POST commodities — removing a line', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should splice out the line the button names and return to the list', async () => {
    const result = await driveHandler(post, {
      seed: TWO_LINES,
      payload: { action: 'remove:0' }
    })

    expect(result.after.commodityLines).toEqual([TWO_LINES.commodityLines[1]])
    expect(result.response.redirect).toBe(pagePath(result.journeyId, LIST_SLUG))
  })

  it('Should refuse an index the collection does not hold', async () => {
    const result = await driveHandler(post, {
      seed: TWO_LINES,
      payload: { action: 'remove:7' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after.commodityLines).toEqual(TWO_LINES.commodityLines)
    expectOneRefusalLogged(result.logger, {
      journeyId: result.journeyId,
      errorCodes: [],
      reason: 'remove-index-out-of-range',
      removeAction: 'remove:7'
    })
  })

  it('Should refuse a malformed index rather than splice the first line', async () => {
    const result = await driveHandler(post, {
      seed: TWO_LINES,
      payload: { action: 'remove:NaN' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.after.commodityLines).toEqual(TWO_LINES.commodityLines)
  })
})

describe('POST commodities — continuing', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should go on to origin once a line exists', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: {}
    })

    expect(result.response).toEqual({
      redirect: withTrail(pagePath(result.journeyId, originPage.slug), [
        LIST_SLUG
      ])
    })
  })

  it('Should hold a consignment left empty by a type change at the collection floor, still reporting the removed lines', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: {},
      query: { removed: '2', ...trailQuery(COMMODITY_TYPE_SLUG) }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.removedCount).toBe(2)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: ADD_AT_LEAST_ONE, href: '#commodityLines' }
    ])
    expectNoRefusalLogged(result.logger)
  })

  it('Should commit nothing of its own', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: {}
    })

    expect(result.after).toEqual(result.before)
  })
})

describe('POST commodities — save failures', () => {
  useStubbedHighRiskPlantsJourney()

  it('Should re-render a backend request failure at 500 with the banner', async () => {
    const failure = unavailableBackendError('save answers')

    const result = await driveHandler(post, {
      saveFailure: failure,
      seed: TWO_LINES,
      payload: { action: 'remove:0' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expectOneSaveFallbackLogged(result.logger, {
      journeyId: result.journeyId,
      err: failure,
      action: 'remove-line',
      index: 0
    })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    await expect(
      driveHandler(post, {
        seed: TWO_LINES,
        payload: { action: 'remove:0' },
        saveFailure: new TypeError('programming failure')
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})

describe.each([
  ['opened from Overview', {}],
  ['opened from a Change link', { query: reviewChangeLinkQuery() }],
  ['while amending', { amend: true }]
])('POST commodities — %s', (_start, start) => {
  useStubbedHighRiskPlantsJourney()

  it('Should keep the trader on the list after removing a line', async () => {
    const result = await driveHandler(post, {
      ...start,
      seed: TWO_LINES,
      payload: { action: 'remove:0' }
    })

    expect(result.response.redirect).toBe(
      `${pagePath(result.journeyId, LIST_SLUG)}${start.query ? '?from=notification-view' : ''}`
    )
  })

  it('Should go on to origin when the list is continued', async () => {
    const result = await driveHandler(post, {
      ...start,
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: {}
    })

    expect(result.response.redirect).toBe(
      withTrail(pagePath(result.journeyId, originPage.slug), [
        ...(start.query ? [CYA_SLUG] : []),
        LIST_SLUG
      ])
    )
  })
})
