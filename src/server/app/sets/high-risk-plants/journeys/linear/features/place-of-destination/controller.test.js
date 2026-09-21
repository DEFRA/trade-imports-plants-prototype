import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest'

// Real-mode address-book fetches flow through toRecord → originLabel, which
// self-loads via a countries fetch. Mock the countries reader so the fetch
// stub only has to answer address-book URLs.
vi.mock('../../../../../../services/countries/index.js', () => {
  const LABELS = { BE: 'Belgium', GB: 'United Kingdom' }
  return {
    ensureLoaded: async () => {},
    originLabel: async (code) => LABELS[code]
  }
})

import { config } from '../../../../../../../../config/config.js'
import { nunjucksConfig } from '../../../../../../../../config/nunjucks/nunjucks.js'
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
import { SURFACES } from '../../../../../../shared/kit.js'
import { PAGE_SIZE } from '../../../../../../services/address-book/index.js'
import { installHighRiskPlantsJourney } from '../../test-support.js'
import { ALREADY_ARRIVED, NOT_YET_ARRIVED } from '../arrival-status/statuses.js'
import { copy } from './copy/copy.en.js'
import * as placeOfDestination from './controller.js'

const get = placeOfDestination.routes.find(
  (route) => route.method === 'GET'
).handler
const post = postHandlerOf(placeOfDestination)

const PLANTS_FOR_PLANTING = 'plants-for-planting'
const POTATOES = 'potatoes'

// Records the stub address book holds. `TECH_IMPORTS` is on the first page of
// results and `ALPINE` on the last, so a test that needs a row the first page
// does not show has one.
const TECH_IMPORTS = 'tech-imports-ltd'
const IMPORT_CO = 'import-co-uk'
const ALPINE = 'alpine-supplies-gmbh'
const NOT_IN_THE_BOOK = 'no-such-address'
const STUB_BOOK_SIZE = 13
const LAST_PAGE = 3

// The two records the stub book holds in Denmark — what a search for the
// country narrows the results to.
const DENMARK = 'Denmark'
const DENMARK_ROWS = ['copenhagen-exports-aps', 'aarhus-trading-aps']
const MATCHES_NOTHING = 'nothing matches this'

const potatoes = (answers = {}) => ({ commodityType: POTATOES, ...answers })

const plants = (answers = {}) => ({
  commodityType: PLANTS_FOR_PLANTING,
  ...answers
})

const installStubs = () => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  installHighRiskPlantsJourney()
}

const rowIds = (result) => result.view.context.picker.rows.map((row) => row.id)

const checkedId = (result) =>
  result.view.context.picker.rows.find((row) => row.checked)?.id

const environment = nunjucksConfig.options.compileOptions.environment

const TEMPLATE =
  'high-risk-plants/journeys/linear/features/place-of-destination/template.njk'

/** The page as a browser gets it. The view context alone cannot show whether a
 * record's name reaches the browser as text or as markup. */
const renderPage = (context) =>
  environment.render(TEMPLATE, {
    userSession: { isAuthenticated: true },
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

// An address-book record name is written by the organisation, not by this
// service, so it may hold anything at all.
const MARKUP_IN_A_NAME = '</span><a href="https://evil.example">x</a><span>'
const MARKUP_LINK = '<a href="https://evil.example"'

// The address book the API serves in real mode: two live records the search
// returns, and one the organisation has soft-deleted, which the API still
// resolves by id so a caller can tell a deletion from a record that never was.
const DELETED_ID = 'closed-depot-ltd'

const apiRecord = (id, overrides = {}) => ({
  id,
  name: `Record ${id}`,
  addressLine1: '1 Test Street',
  townOrCity: 'Testville',
  postcode: 'TE5 7ER',
  countryCode: 'BE',
  deleted: false,
  ...overrides
})

const LIVE_RECORDS = [apiRecord('live-depot-one'), apiRecord('live-depot-two')]
const API_PAGE_SIZE = 25

const okJson = (body) => ({ ok: true, status: 200, json: async () => body })

const bookHoldingADeletedRecord = () =>
  vi.fn(async (url) =>
    url.endsWith(`/addresses/${DELETED_ID}`)
      ? okJson(apiRecord(DELETED_ID, { deleted: true }))
      : okJson({
          items: LIVE_RECORDS,
          page: 1,
          pageSize: API_PAGE_SIZE,
          totalItems: LIVE_RECORDS.length,
          totalPages: 1
        })
  )

describe('#meta', () => {
  it('Should own the place-of-destination obligation at its own slug', () => {
    expect(placeOfDestination.meta).toEqual({
      id: 'place-of-destination',
      slug: 'destinations/select',
      collects: ['placeOfDestination']
    })
  })
})

describe('GET place-of-destination — the question it asks', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should title the page and caption the destination section', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.pageTitle).toBe('Place of destination')
    expect(result.view.context.caption).toBe('Destination')
  })

  it('Should render the results table on the full-width surface', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.contentColumnClass).toBe(SURFACES.display)
  })

  it('Should ask potatoes for the place of destination', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.heading).toBe(copy.headings.potatoes)
    expect(result.view.context.description).toBe(copy.descriptions.potatoes)
  })

  it('Should ask a consignment on its way for the place of destination', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: NOT_YET_ARRIVED })
    })

    expect(result.view.context.heading).toBe(copy.headings['not-yet-arrived'])
  })

  it('Should ask a consignment already here where it is now', async () => {
    const result = await driveHandler(get, {
      seed: plants({ arrivalStatus: ALREADY_ARRIVED })
    })

    expect(result.view.context.heading).toBe(copy.headings['already-arrived'])
    expect(result.view.context.description).toBe(
      copy.descriptions['already-arrived']
    )
  })

  it('Should ask the pre-arrival question when no status has been chosen', async () => {
    const result = await driveHandler(get, { seed: plants() })

    expect(result.view.context.heading).toBe(copy.headings['not-yet-arrived'])
  })

  it('Should send Back to the overview and raise no error summary', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.backLink).toBe(hubPath(result.journeyId))
    expect(result.view.context.errorSummary).toBeNull()
  })
})

describe('GET place-of-destination — the address book it offers', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should show the first page of the organisation book, counted against the whole', async () => {
    const result = await driveHandler(get, { seed: potatoes() })

    expect(result.view.context.picker.rows).toHaveLength(PAGE_SIZE)
    expect(result.view.context.picker.resultsCaption).toBe(
      copy.resultsCaption(PAGE_SIZE, STUB_BOOK_SIZE)
    )
    expect(result.view.context.picker.page).toBe(1)
  })

  it('Should narrow the rows to the search term in the query string', async () => {
    const result = await driveHandler(get, {
      seed: potatoes(),
      query: { q: DENMARK }
    })

    expect(rowIds(result)).toEqual(DENMARK_ROWS)
    expect(result.view.context.picker.query).toBe(DENMARK)
  })

  it('Should show the page the query string asks for', async () => {
    const result = await driveHandler(get, {
      seed: potatoes(),
      query: { page: String(LAST_PAGE) }
    })

    expect(result.view.context.picker.page).toBe(LAST_PAGE)
    expect(rowIds(result)).toContain(ALPINE)
  })

  it('Should say so rather than showing an empty table when nothing matches', async () => {
    const result = await driveHandler(get, {
      seed: potatoes(),
      query: { q: MATCHES_NOTHING }
    })

    expect(result.view.context.picker.rows).toEqual([])
    expect(result.view.context.picker.pagination).toBeNull()
  })

  it('Should tick the address the notification already references', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ placeOfDestination: { addressId: TECH_IMPORTS } })
    })

    expect(checkedId(result)).toBe(TECH_IMPORTS)
    expect(result.view.context.picker.selected.name).toBe('Tech Imports Ltd')
  })

  it('Should carry a selection the query string names over the stored one', async () => {
    // Paging carries the tick in the query string, so a row ticked on one page
    // is still ticked after moving to another and back.
    const result = await driveHandler(get, {
      seed: potatoes({ placeOfDestination: { addressId: TECH_IMPORTS } }),
      query: { selected: IMPORT_CO }
    })

    expect(checkedId(result)).toBe(IMPORT_CO)
  })

  it('Should show no selection for a reference the book no longer holds', async () => {
    // A record the organisation has deleted reads as never entered, so it must
    // not travel as "Selected address" or in the paging links either.
    const result = await driveHandler(get, {
      seed: potatoes({ placeOfDestination: { addressId: NOT_IN_THE_BOOK } })
    })

    expect(result.view.context.picker.selected).toBeUndefined()
    expect(checkedId(result)).toBeUndefined()
  })
})

describe('POST place-of-destination — searching', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should re-render the narrowed results without committing anything', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'search', q: DENMARK }
    })

    expect(rowIds(result)).toEqual(DENMARK_ROWS)
    expect(result.after.placeOfDestination).toBeUndefined()
    expect(result.view.context.errorSummary).toBeNull()
  })

  it('Should start a new search at the first page', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'search', q: '', page: String(LAST_PAGE) }
    })

    expect(result.view.context.picker.page).toBe(1)
  })

  it('Should keep a row already ticked while the results change', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'search', q: 'Imports', selected: TECH_IMPORTS }
    })

    expect(checkedId(result)).toBe(TECH_IMPORTS)
  })
})

describe('POST place-of-destination — the answers it refuses', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should refuse a save with nothing chosen', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save' }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      {
        text: copy.errors.placeOfDestination,
        href: '#placeOfDestination'
      }
    ])
    expect(result.after.placeOfDestination).toBeUndefined()
  })

  it('Should refuse an id the address book does not hold', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', placeOfDestination: NOT_IN_THE_BOOK }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.error).toBe(
      copy.errors.placeOfDestination
    )
    expect(result.after.placeOfDestination).toBeUndefined()
  })

  it('Should keep the refused search term so the results are still there', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', q: DENMARK }
    })

    expect(result.view.context.picker.query).toBe(DENMARK)
    expect(rowIds(result)).toEqual(DENMARK_ROWS)
  })

  it('Should point a refusal at the search box when the search found nothing', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', q: MATCHES_NOTHING }
    })

    expect(result.view.context.errorSummary.errorList).toEqual([
      { text: copy.errors.placeOfDestination, href: '#q' }
    ])
  })

  it('Should re-render the page the refusal was made on, not the first', async () => {
    // The form posts the page in a hidden field, so a trader refused on the
    // last page is left looking at the last page.
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', page: String(LAST_PAGE) }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.picker.page).toBe(LAST_PAGE)
    expect(rowIds(result)).toContain(ALPINE)
  })

  it('Should link a refusal to the first row of whichever page it refused on', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', page: String(LAST_PAGE) }
    })

    const { picker, errorSummary } = result.view.context
    expect(picker.rows[0].idPrefix).toBe('placeOfDestination')
    expect(errorSummary.errorList[0].href).toBe(`#${picker.rows[0].idPrefix}`)
  })
})

describe('place-of-destination — the record names it renders', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should escape a record name rather than render it as markup', async () => {
    const result = await driveHandler(get, { seed: potatoes() })
    const { picker } = result.view.context

    const html = renderPage({
      ...result.view.context,
      picker: {
        ...picker,
        rows: [{ ...picker.rows[0], name: MARKUP_IN_A_NAME }]
      }
    })

    expect(html).toContain('&lt;a href=')
    expect(html).not.toContain(MARKUP_LINK)
  })
})

describe('place-of-destination — a destination the organisation has deleted', () => {
  // The real address book resolves a soft-deleted record rather than 404ing it,
  // so only this mode exercises the deleted half of the guard: every stub
  // record carries `deleted: false`.
  const originalMode = config.get('stubMode')

  beforeAll(installStubs)

  beforeEach(() => {
    store.clear()
    config.set('stubMode', false)
    vi.stubGlobal('fetch', bookHoldingADeletedRecord())
  })

  afterEach(() => {
    config.set('stubMode', originalMode)
    vi.unstubAllGlobals()
  })

  it('Should show no selection for a destination deleted since it was chosen', async () => {
    const result = await driveHandler(get, {
      seed: potatoes({ placeOfDestination: { addressId: DELETED_ID } })
    })

    expect(result.view.context.picker.selected).toBeUndefined()
    expect(checkedId(result)).toBeUndefined()
  })

  it('Should refuse a save naming a destination the organisation has deleted', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', placeOfDestination: DELETED_ID }
    })

    expect(result.response.statusCode).toBe(400)
    expect(result.view.context.errorSummary.errorList).toEqual([
      {
        text: copy.errors.placeOfDestination,
        href: '#placeOfDestination'
      }
    ])
    expect(result.after.placeOfDestination).toBeUndefined()
  })
})

describe('POST place-of-destination — accepted answers', () => {
  beforeAll(installStubs)
  beforeEach(() => store.clear())

  it('Should commit the address-book id alone, never a copy of the address', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', placeOfDestination: TECH_IMPORTS }
    })

    expect(result.after.placeOfDestination).toEqual({
      addressId: TECH_IMPORTS
    })
  })

  it('Should accept the row carried in the hidden field when no radio is posted', async () => {
    // A trader who ticks a row, pages away and comes back saves the selection
    // from the hidden field rather than from a radio on the page in front of
    // them.
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', selected: ALPINE }
    })

    expect(result.after.placeOfDestination).toEqual({ addressId: ALPINE })
  })

  it('Should redirect to the overview, the page after the destination section', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { action: 'save', placeOfDestination: TECH_IMPORTS }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
  })

  it('Should honour Save and return to overview', async () => {
    const result = await driveHandler(post, {
      seed: potatoes(),
      payload: { placeOfDestination: TECH_IMPORTS, exit: 'hub' }
    })

    expect(result.response).toEqual({ redirect: hubPath(result.journeyId) })
    expect(result.after.placeOfDestination).toEqual({
      addressId: TECH_IMPORTS
    })
  })

  it('Should replace an address already referenced rather than keeping both', async () => {
    const result = await driveHandler(post, {
      seed: potatoes({ placeOfDestination: { addressId: TECH_IMPORTS } }),
      payload: { action: 'save', placeOfDestination: IMPORT_CO }
    })

    expect(result.after.placeOfDestination).toEqual({ addressId: IMPORT_CO })
  })
})

describe('POST place-of-destination — save failures', () => {
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

  it('Should re-render a backend request failure at 500 with the banner and the selection', async () => {
    failingOnControllerCommit(realRecords.replaceFulfilment)

    const result = await driveHandler(post, {
      payload: { action: 'save', placeOfDestination: TECH_IMPORTS }
    })

    expect(result.response.statusCode).toBe(500)
    expect(result.view.context.recoverableError).toBe(true)
    expect(checkedId(result)).toBe(TECH_IMPORTS)
  })

  it('Should let a programming error escape to the promoted catch-all', async () => {
    failingOnControllerCommit(async () => {
      throw new TypeError('programming failure')
    })

    await expect(
      driveHandler(post, {
        payload: { action: 'save', placeOfDestination: TECH_IMPORTS }
      })
    ).rejects.toThrow(new TypeError('programming failure'))
  })
})
