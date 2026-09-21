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
import { makeScope } from '../../../../../../../engine/index.js'
import { pagePath } from '../../../../../../../shared/paths.js'
import {
  COMPLETE_POTATO_CONSIGNMENT,
  installHighRiskPlantsJourney
} from '../../../test-support.js'
import * as details from './details.controller.js'

const get = details.routes.find((route) => route.method === 'GET').handler
const post = postHandlerOf(details)

const POTATOES = 'potatoes'
const PLANTS = 'plants-for-planting'
const WOOD = 'wood-and-cut-trees'
const SEED_POTATOES = 'seed-potatoes'
const WARE_POTATOES = 'ware-potatoes'
const TREES = 'trees-for-planting'
const HARDWOOD_CHIPS = 'hardwood-chips'
const MARIS_PIPER = 'Maris Piper'
const PLANTING = 'Planting'
const POTATO_QUANTITY = '250'
const SELECT_THE_CATEGORY = 'Select the category of goods'
const LIST_SLUG = 'commodities'
const DETAILS_SLUG = 'commodities/details'
const COMMODITY_TYPE_SLUG = 'commodity-type'
const HARDWOOD_ROUND_SURFACE = 'hardwood-round-surface'
const FRAXINUS = 'Fraxinus'

const POTATO_LINE = {
  category: SEED_POTATOES,
  potatoVariety: MARIS_PIPER,
  quantity: POTATO_QUANTITY,
  potatoIntendedUse: PLANTING
}

const namesOf = (context) => context.fieldViews.map((field) => field.name)

const install = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  installHighRiskPlantsJourney()
}

describe('#meta', () => {
  it('Should collect nothing — the list page owns the group', () => {
    expect(details.meta).toEqual({
      id: 'commodity-details',
      slug: 'commodities/details',
      collects: []
    })
  })
})

describe('GET commodities/details', () => {
  beforeAll(install)
  beforeEach(() => store.clear())

  it('Should offer only the categories the notification’s type allows', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.categoryItems.map((item) => item.value)).toEqual(
      [SEED_POTATOES, WARE_POTATOES]
    )
  })

  it('Should reveal no field until a category is chosen', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.fieldViews).toEqual([])
    expect(result.view.context.revealed).toBe(false)
  })

  it('Should hint the wood exclusion only on a wood notification', async () => {
    const wood = await driveHandler(get, {
      seed: { commodityType: WOOD }
    })
    const potatoes = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(wood.view.context.categoryHint).toContain('Preservative-treated')
    expect(potatoes.view.context.categoryHint).toBeUndefined()
  })

  it('Should reveal the saved line’s fields and prefill them', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES, commodityLines: [POTATO_LINE] },
      query: { index: '0' }
    })

    expect(namesOf(result.view.context)).toEqual([
      'potatoVariety',
      'quantity',
      'potatoIntendedUse'
    ])
    expect(result.view.context.values).toEqual(POTATO_LINE)
    expect(result.view.context.revealed).toBe(true)
  })

  it('Should reveal exactly the fields the model holds in scope for the line', async () => {
    const answers = {
      commodityType: POTATOES,
      commodityLines: [POTATO_LINE]
    }
    const result = await driveHandler(get, {
      seed: answers,
      query: { index: '0' }
    })
    const { inScope } = makeScope(answers)
    const lineKeys = [...inScope].filter((key) =>
      key.startsWith('commodityLines[0].')
    )

    for (const field of namesOf(result.view.context)) {
      expect(inScope.has(`commodityLines[0].${field}`), field).toBe(true)
    }
    expect(new Set(lineKeys)).toEqual(
      new Set([
        'commodityLines[0].category',
        ...namesOf(result.view.context).map(
          (field) => `commodityLines[0].${field}`
        )
      ])
    )
  })

  it('Should offer a genus list narrowed to the line’s category', async () => {
    const result = await driveHandler(get, {
      seed: {
        commodityType: WOOD,
        commodityLines: [{ category: HARDWOOD_CHIPS }]
      },
      query: { index: '0' }
    })

    const genus = result.view.context.fieldViews.find(
      (field) => field.name === 'genus'
    )
    expect(genus.items.map((item) => item.value)).toEqual([
      '',
      'Castanea',
      'Fraxinus',
      'Platanus'
    ])
  })

  it('Should send an index the collection does not hold back to the list', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES, commodityLines: [POTATO_LINE] },
      query: { index: '4' }
    })

    expect(result.response.redirect).toBe(pagePath(result.journeyId, LIST_SLUG))
  })

  it('Should send a malformed index back to the list rather than act on it', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES, commodityLines: [POTATO_LINE] },
      query: { index: 'nonsense' }
    })

    expect(result.response.redirect).toBe(pagePath(result.journeyId, LIST_SLUG))
  })

  it('Should send Back to the entry question until the collection holds a line', async () => {
    const result = await driveHandler(get, {
      seed: { commodityType: POTATOES }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, COMMODITY_TYPE_SLUG)
    )
  })

  it('Should send Back to the list once the collection holds a line', async () => {
    const result = await driveHandler(get, {
      seed: COMPLETE_POTATO_CONSIGNMENT,
      query: { index: '0' }
    })

    expect(result.view.context.backLink).toBe(
      pagePath(result.journeyId, LIST_SLUG)
    )
  })

  it('Should send a commodity type that offers no category back to the question', async () => {
    const result = await driveHandler(get, { seed: {} })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITY_TYPE_SLUG)
    )
  })
})

describe('POST commodities/details — choosing a category', () => {
  beforeAll(install)
  beforeEach(() => store.clear())

  it('Should create the line and come back for the fields it asks for', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: { category: SEED_POTATOES }
    })

    expect(result.after.commodityLines).toEqual([{ category: SEED_POTATOES }])
    expect(result.response.redirect).toBe(
      `${pagePath(result.journeyId, DETAILS_SLUG)}?index=0`
    )
  })

  it('Should answer 400 for a blank category, committing nothing', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: { category: '' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.category).toBe(SELECT_THE_CATEGORY)
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a category that belongs to another commodity type', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: { category: PLANTS }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: SELECT_THE_CATEGORY, href: '#category' }
    ])
    expect(result.after).toEqual(result.before)
  })

  it('Should refuse a category name Object.prototype answers rather than throw', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityType: PLANTS,
        commodityLines: [{ category: PLANTS }]
      },
      payload: { index: '0', category: 'constructor' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.category).toBe(SELECT_THE_CATEGORY)
  })

  it('Should send a commodity type that offers no category back to the question', async () => {
    const result = await driveHandler(post, {
      seed: {},
      payload: { category: 'not-a-real-category' }
    })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, COMMODITY_TYPE_SLUG)
    )
    expect(result.after).toEqual(result.before)
  })
})

describe('POST commodities/details — saving a line', () => {
  beforeAll(install)
  beforeEach(() => store.clear())

  const seededLine = {
    seed: {
      commodityType: POTATOES,
      commodityLines: [{ category: SEED_POTATOES }]
    }
  }

  it('Should commit the cleaned values and return to the list', async () => {
    const result = await driveHandler(post, {
      ...seededLine,
      payload: {
        index: '0',
        category: SEED_POTATOES,
        potatoVariety: `  ${MARIS_PIPER}  `,
        quantity: POTATO_QUANTITY,
        potatoIntendedUse: PLANTING
      }
    })

    expect(result.after.commodityLines).toEqual([POTATO_LINE])
    expect(result.response.redirect).toBe(pagePath(result.journeyId, LIST_SLUG))
  })

  it('Should go back for another line on Save and add another', async () => {
    const result = await driveHandler(post, {
      ...seededLine,
      payload: {
        index: '0',
        action: 'add',
        category: SEED_POTATOES,
        potatoVariety: MARIS_PIPER,
        quantity: POTATO_QUANTITY,
        potatoIntendedUse: PLANTING
      }
    })

    expect(result.response.redirect).toBe(
      pagePath(result.journeyId, DETAILS_SLUG)
    )
  })

  it('Should answer 400 and keep what was typed when a field is blank', async () => {
    const result = await driveHandler(post, {
      ...seededLine,
      payload: {
        index: '0',
        category: SEED_POTATOES,
        potatoVariety: MARIS_PIPER,
        quantity: '',
        potatoIntendedUse: ''
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.quantity).toBe('Enter the quantity')
    expect(result.view.context.errors.potatoIntendedUse).toBe(
      'Enter the intended use'
    )
    expect(result.view.context.values.potatoVariety).toBe(MARIS_PIPER)
    expect(result.after.commodityLines).toEqual([{ category: SEED_POTATOES }])
  })

  it('Should refuse a quantity that is not a whole number above zero', async () => {
    const result = await driveHandler(post, {
      ...seededLine,
      payload: {
        index: '0',
        category: SEED_POTATOES,
        potatoVariety: MARIS_PIPER,
        quantity: '0',
        potatoIntendedUse: PLANTING
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.quantity).toBe(
      'Enter a whole number greater than 0'
    )
  })

  it('Should refuse a genus the line’s category does not offer', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityType: WOOD,
        commodityLines: [{ category: HARDWOOD_CHIPS }]
      },
      payload: {
        index: '0',
        category: HARDWOOD_CHIPS,
        genus: 'Picea',
        commodityCode: '4401 41 00',
        quantity: '12',
        phytosanitaryTreatments: 'Kiln dried'
      }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errors.genus).toBe('Select the genus')
  })

  it('Should store only the fields the category asks for', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityType: PLANTS,
        commodityLines: [{ category: TREES }]
      },
      payload: {
        index: '0',
        action: 'add',
        crumb: 'token',
        category: TREES,
        genus: 'Quercus',
        species: 'Quercus robur',
        commodityCode: '0602 20 20',
        quantity: '40',
        eppoCode: 'QUERO',
        sizeOfTree: '3.5'
      }
    })

    expect(result.after.commodityLines).toEqual([
      {
        category: TREES,
        genus: 'Quercus',
        species: 'Quercus robur',
        commodityCode: '0602 20 20',
        quantity: '40',
        eppoCode: 'QUERO',
        sizeOfTree: '3.5'
      }
    ])
  })

  it('Should rewrite the line and re-ask when its category changes', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: PLANTS, commodityLines: [{ category: PLANTS }] },
      payload: { index: '0', category: TREES }
    })

    expect(result.after.commodityLines).toEqual([{ category: TREES }])
    expect(result.response.redirect).toBe(
      `${pagePath(result.journeyId, DETAILS_SLUG)}?index=0`
    )
  })

  it('Should keep the saved category’s genus list on a rejected re-render', async () => {
    const result = await driveHandler(post, {
      seed: {
        commodityType: WOOD,
        commodityLines: [{ category: HARDWOOD_ROUND_SURFACE, genus: FRAXINUS }]
      },
      payload: { index: '0', category: '', genus: FRAXINUS }
    })

    expect(result.response.statusCode).toBe(400)
    expect(namesOf(result.view.context)).toEqual([
      'genus',
      'commodityCode',
      'quantity',
      'phytosanitaryTreatments'
    ])
    const genus = result.view.context.fieldViews.find(
      (field) => field.name === 'genus'
    )
    expect(genus.items.map((item) => item.value)).toEqual([
      '',
      'Castanea',
      FRAXINUS,
      'Platanus'
    ])
    expect(genus.items.find((item) => item.value === FRAXINUS).selected).toBe(
      true
    )
  })

  it('Should treat a stale index as a new line rather than write over one', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES, commodityLines: [POTATO_LINE] },
      payload: { index: '9', category: WARE_POTATOES }
    })

    expect(result.after.commodityLines).toEqual([
      POTATO_LINE,
      { category: WARE_POTATOES }
    ])
  })

  it('Should carry a change context through every redirect', async () => {
    const result = await driveHandler(post, {
      seed: { commodityType: POTATOES },
      payload: { category: SEED_POTATOES },
      query: { change: '1' }
    })

    expect(result.response.redirect).toMatch(
      /\/commodities\/details\?index=0&change=1$/
    )
  })
})

describe('POST commodities/details — save failures', () => {
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
      seed: { commodityType: POTATOES },
      payload: { category: SEED_POTATOES }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(result.view.context.fieldViews).toEqual([])
    expect(result.view.context.revealed).toBe(false)
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, {
        seed: { commodityType: POTATOES },
        payload: { category: SEED_POTATOES }
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
