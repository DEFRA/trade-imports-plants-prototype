import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { store } from '../../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../../engine/test-support.js'
import { hubPath, pagePath } from '../../../../../../../shared/paths.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../../../test-support.js'
import * as list from './list.controller.js'

const get = list.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(list)

const POTATOES = 'potatoes'
const ADD_AT_LEAST_ONE = 'Add at least one commodity'
const LIST_SLUG = 'commodities'
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

const install = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  installHighRiskPlantsJourney()
}

describe('#meta', () => {
  it('Should own the commodityLines group on the commodities page', () => {
    expect(list.meta).toEqual({
      id: 'commodities',
      slug: 'commodities',
      collects: ['commodityLines']
    })
  })
})

describe('GET commodities', () => {
  beforeAll(install)
  beforeEach(() => store.clear())

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

  it('Should send Back to the overview', async () => {
    const result = await driveHandler(get, { seed: TWO_LINES })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('POST commodities — removing a line', () => {
  beforeAll(install)
  beforeEach(() => store.clear())

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
  beforeAll(install)
  beforeEach(() => store.clear())

  it('Should leave the section for the overview once a line exists', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: {}
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should hold an empty consignment at the collection floor', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: {}
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: ADD_AT_LEAST_ONE, href: '#commodityLines' }
    ])
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
  beforeAll(() => {
    configureSession(sessionStub)
    installHighRiskPlantsJourney()
  })

  beforeEach(() => {
    store.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      }))
    )
  })

  afterEach(() => {
    configureRecords(recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords({
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      seed: TWO_LINES,
      payload: { action: 'remove:0' }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, { seed: TWO_LINES, payload: { action: 'remove:0' } })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
