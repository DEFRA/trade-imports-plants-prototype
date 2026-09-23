import { SET_BASE, SET_ID } from '../../../../set.js'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { store } from '../../../../../../engine/store.js'
import { configureRecords } from '../../../../../../engine/persistence/records.js'
import { configureSession } from '../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../services/persistence/records/stub/index.js'
import { records as realRecords } from '../../../../../../services/persistence/records/real/index.js'
import { session as sessionStub } from '../../../../../../services/persistence/session/stub.js'
import {
  driveHandler,
  postHandlerOf
} from '../../../../../../engine/test-support.js'
import { hubPath } from '../../../../../../shared/paths.js'
import * as countries from '../../../../../../services/countries/index.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../../test-support.js'
import { copy } from './copy/copy.en.js'
import * as origin from './controller.js'

const get = origin.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(origin)

const FRANCE = 'FR'
const SPAIN = 'ES'
const NORWAY = 'NO'
const GERMANY = 'DE'
const UNOFFERED_COUNTRY = 'ZZ'
const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const WARE_POTATOES = 'ware-potatoes'
const CONIFER_WOOD_WITHOUT_BARK = 'conifer-wood-without-bark'
const CONIFER_WOOD_WITH_BARK = 'conifer-wood-with-bark'
const EU_MEMBER_STATES = 'eu-member-states'

const WARE_POTATO_LINE = { category: WARE_POTATOES, quantity: '250' }
const CONIFER_WOOD_LINE = {
  category: CONIFER_WOOD_WITHOUT_BARK,
  quantity: '12'
}
const BARKED_CONIFER_WOOD_LINE = {
  category: CONIFER_WOOD_WITH_BARK,
  quantity: '8'
}
const PLANTS_LINE = { category: PLANTS_FOR_PLANTING, quantity: '30' }

const consignmentOf = (commodityType, ...lines) => ({
  commodityType,
  commodityLines: lines
})

const installStubs = () => {
  configureRecords(SET_ID, recordsStub)
  configureSession(SET_ID, sessionStub)
  installHighRiskPlantsJourney()
}

describe('#meta', () => {
  it('Should own the countryOfOrigin obligation on the origin page', () => {
    expect(origin.meta).toEqual({
      id: 'origin',
      slug: 'origin',
      collects: ['countryOfOrigin']
    })
  })
})

describe('GET origin', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should render the page title as the heading and caption the section', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.pageTitle).toBe('Origin of the import')
    expect(result.view.context.caption).toBe('About the consignment')
  })

  it('Should offer a placeholder ahead of every country the service primes', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.countryItems[0]).toEqual({
      value: '',
      text: copy.country.placeholder
    })
    expect(result.view.context.countryItems.slice(1)).toEqual(
      await countries.originCountries()
    )
  })

  it('Should show no answer and no error on a notification with none', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.values).toEqual({ countryOfOrigin: '' })
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should prefill the stored country', async () => {
    const result = await driveHandler(get, {
      seed: { countryOfOrigin: FRANCE }
    })

    expect(result.view.context.values).toEqual({ countryOfOrigin: FRANCE })
  })

  it('Should send Back to the dashboard while nothing is committed', async () => {
    const result = await driveHandler(get)

    expect(result.view.context.backLink).toBe(SET_BASE)
  })

  it('Should send Back to the overview once the notification has an answer', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
  })
})

describe('GET origin — the ware-potato scope guidance', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should show the guidance while the consignment holds a ware-potato line', async () => {
    const result = await driveHandler(get, {
      seed: consignmentOf(POTATOES, WARE_POTATO_LINE)
    })

    expect(result.view.context.guidance).toEqual([copy.guidance[WARE_POTATOES]])
  })

  it('Should show no guidance for a consignment of seed potatoes alone', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_POTATO_CONSIGNMENT
    })

    expect(result.view.context.guidance).toEqual([])
  })

  it('Should show no guidance for a constraint that has none to give', async () => {
    const result = await driveHandler(get, {
      seed: consignmentOf(PLANTS_FOR_PLANTING, PLANTS_LINE)
    })

    expect(result.view.context.guidance).toEqual([])
  })
})

describe('POST origin — a rejected answer', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should answer 400 for no country, committing nothing', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.countryRequired
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should answer 400 for a country the origin block does not offer', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: UNOFFERED_COUNTRY }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.countryRequired
    )
  })

  it('Should re-render the raw entered value and summarise the error', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: UNOFFERED_COUNTRY }
    })

    expect(result.view.context.values).toEqual({
      countryOfOrigin: UNOFFERED_COUNTRY
    })
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.countryRequired, href: '#countryOfOrigin' }
    ])
  })
})

describe('POST origin — the per-category narrowing', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should accept any primed country while every line is seed potatoes', async () => {
    const result = await driveHandler(post, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      payload: { countryOfOrigin: NORWAY }
    })

    expect(result.after.countryOfOrigin).toBe(NORWAY)
  })

  it('Should refuse a non-EU country for plants for planting', async () => {
    const result = await driveHandler(post, {
      seed: consignmentOf(PLANTS_FOR_PLANTING, PLANTS_LINE),
      payload: { countryOfOrigin: NORWAY }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.narrowing[EU_MEMBER_STATES]
    )
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse an EU country outside the four ware-potato countries', async () => {
    const result = await driveHandler(post, {
      seed: consignmentOf(POTATOES, WARE_POTATO_LINE),
      payload: { countryOfOrigin: FRANCE }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.narrowing[WARE_POTATOES]
    )
  })

  it('Should refuse a country outside the four conifer-wood countries', async () => {
    const result = await driveHandler(post, {
      seed: consignmentOf(WOOD_AND_CUT_TREES, CONIFER_WOOD_LINE),
      payload: { countryOfOrigin: GERMANY }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.narrowing[CONIFER_WOOD_WITHOUT_BARK]
    )
  })

  it('Should report the narrowest failing constraint when a consignment breaks two', async () => {
    // Norway is outside both the four conifer-wood countries and the EU
    // member-State list; the trader is told about the narrower of the two.
    const result = await driveHandler(post, {
      seed: consignmentOf(
        WOOD_AND_CUT_TREES,
        CONIFER_WOOD_LINE,
        BARKED_CONIFER_WOOD_LINE
      ),
      payload: { countryOfOrigin: NORWAY }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.countryOfOrigin).toBe(
      copy.errors.narrowing[CONIFER_WOOD_WITHOUT_BARK]
    )
  })

  it('Should accept a country every constraint on the consignment allows', async () => {
    const result = await driveHandler(post, {
      seed: consignmentOf(POTATOES, WARE_POTATO_LINE),
      payload: { countryOfOrigin: SPAIN }
    })

    expect(result.after.countryOfOrigin).toBe(SPAIN)
  })

  it('Should keep the guidance on the page it refuses', async () => {
    const result = await driveHandler(post, {
      seed: consignmentOf(POTATOES, WARE_POTATO_LINE),
      payload: { countryOfOrigin: FRANCE }
    })

    expect(result.view.context.guidance).toEqual([copy.guidance[WARE_POTATOES]])
  })

  it('Should narrow nothing while the consignment holds no line', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: PLANTS_FOR_PLANTING },
      payload: { countryOfOrigin: NORWAY }
    })

    expect(result.after.countryOfOrigin).toBe(NORWAY)
  })
})

describe('POST origin — an accepted answer', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should commit exactly the chosen country', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: FRANCE, crumb: 'token' }
    })

    expect(result.after).toEqual({ countryOfOrigin: FRANCE })
  })

  it('Should redirect to the overview, the page after the run’s last step', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: FRANCE }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      payload: { countryOfOrigin: FRANCE, exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after).toEqual({ countryOfOrigin: FRANCE })
  })
})

describe('POST origin — save failures', () => {
  beforeAll(() => {
    configureSession(SET_ID, sessionStub)
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
    configureRecords(SET_ID, recordsStub)
    vi.unstubAllGlobals()
  })

  const failingOnControllerCommit = (failure) => {
    let replaceCalls = 0
    configureRecords(SET_ID, {
      ...recordsStub,
      replaceFulfilment: (...args) => {
        replaceCalls += 1
        return replaceCalls === 1
          ? recordsStub.replaceFulfilment(...args)
          : failure(...args)
      }
    })
  }

  it('Should re-render a backend request failure at 500 with the banner and the value', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { countryOfOrigin: FRANCE }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.values).toEqual({ countryOfOrigin: FRANCE })
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, { payload: { countryOfOrigin: FRANCE } })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
