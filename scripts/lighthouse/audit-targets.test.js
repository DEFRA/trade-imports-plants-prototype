import { SET_BASE } from '../../src/server/app/sets/high-risk-plants/set.js'
import { SET_BASE as SAMPLE_SET_BASE } from '../../src/server/app/sets/sample-journey/set.js'
import { describe, expect, it } from 'vitest'

import {
  assertTargetsAreCurrent,
  auditableRoutePaths,
  auditPaths,
  auditUrls,
  FILLED_BY,
  QUERY,
  reportName,
  reportNames,
  signInUrl,
  SKIPPED
} from './audit-targets.js'
import { journeyIdIn, SEED_SHAPES } from './seed-notification.js'
import {
  categoriesFor,
  commodityTypes,
  lineFieldsFor,
  originCountriesFor
} from '../../src/server/app/sets/high-risk-plants/services/commodities/index.js'
import { commodityDetailsPage } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/page.js'
import { originPage } from '../../src/server/app/sets/high-risk-plants/journeys/linear/features/origin/page.js'
import { originCountries } from '../../src/server/app/services/countries/index.js'

const COMMODITY_DETAILS_SLUG = commodityDetailsPage.slug
const ORIGIN_SLUG = originPage.slug

const ORIGIN = 'http://localhost:3003'

const COMMODITY_TYPE_STEP = (commodityType) => ({
  slug: 'commodity-type',
  fields: { commodityType }
})

const USE_CASES = [
  'warePotatoes',
  'warePotatoesLate',
  'seedPotatoes',
  'plantsForPlanting',
  'woodWithoutBark'
]

// Confirmation and cancel-amend require lifecycle states the seeds do not
// create, so the synthetic route table carries both skipped paths. No page
// needs a query string yet. Keying the seeded ids off SEED_SHAPES also proves
// the interface between the two modules: FILLED_BY names a shape, and the
// shape has to be one the setup step seeds.
const journeyIds = Object.fromEntries(
  Object.keys(SEED_SHAPES).map((shape, index) => [shape, `PHN-26-000${index}`])
)

// The dashboard's route SHAPE is '/'; Hapi mounts it at the set base, which is
// the URL Lighthouse actually fetches. The two are not interchangeable here.
const DASHBOARD_ROUTE_PATH = '/'
const DASHBOARD_URL_PATH = SET_BASE
const HUB_PATH = '/notifications/{journeyId}'
const DELETE_PATH = '/notifications/{journeyId}/delete'
const CANCEL_AMEND_PATH = '/notifications/{journeyId}/cancel-amend'
const CONFIRMATION_PATH = '/notifications/{journeyId}/confirmation'
const COMMODITY_TYPE_PATH = '/notifications/{journeyId}/commodity-type'
const COMMODITIES_PATH = '/notifications/{journeyId}/commodities'
const COMMODITY_DETAILS_PATH = '/notifications/{journeyId}/commodities/details'
const ORIGIN_PATH = '/notifications/{journeyId}/origin'
const ARRIVAL_STATUS_PATH = '/notifications/{journeyId}/arrival-status'
const CONSIGNOR_PATH = '/notifications/{journeyId}/consignors/select'
const ARRIVAL_DETAILS_PATH = '/notifications/{journeyId}/arrival-details'
const PLACE_OF_DESTINATION_PATH =
  '/notifications/{journeyId}/destinations/select'

const ROUTES = [
  { method: 'GET', path: DASHBOARD_ROUTE_PATH },
  { method: 'GET', path: HUB_PATH },
  { method: 'GET', path: CONFIRMATION_PATH },
  { method: 'GET', path: CANCEL_AMEND_PATH },
  { method: 'GET', path: ORIGIN_PATH },
  { method: 'GET', path: ARRIVAL_STATUS_PATH },
  { method: 'GET', path: CONSIGNOR_PATH },
  { method: 'GET', path: '/notifications/{journeyId}/treatments' },
  { method: 'GET', path: '/notifications/{journeyId}/late-reason' },
  { method: 'GET', path: '/notifications/{journeyId}/uploads/status' },
  { method: 'POST', path: '/notifications' }
]

const GET_PATHS = ROUTES.filter(({ method }) => method === 'GET').map(
  ({ path }) => path
)

const SKIPPED_PATH = '/notifications/{journeyId}/uploads/status'
const TREATMENTS_PATH = '/notifications/{journeyId}/treatments'
const LATE_REASON_PATH = '/notifications/{journeyId}/late-reason'
// The temporary uploads/status entry and both lifecycle-only pages.
const SKIPPED_PATH_COUNT = 3

/** The three maps are empty until pages land, so a test registers the entries
 * it needs for its own length and takes them back out again. */
const withEntries = (map, entries, run) => {
  for (const [key, value] of entries) {
    map.set(key, value)
  }
  try {
    return run()
  } finally {
    for (const [key] of entries) {
      map.delete(key)
    }
  }
}

const withSkipped = (run) =>
  withEntries(
    SKIPPED,
    [[SKIPPED_PATH, 'upload-scan polling — JSON, not a page']],
    run
  )

const withFilledBy = (run) =>
  withEntries(
    FILLED_BY,
    [
      [TREATMENTS_PATH, 'woodWithoutBark'],
      [LATE_REASON_PATH, 'warePotatoesLate']
    ],
    run
  )

describe('#auditPaths', () => {
  it('Should build a URL for every GET route the skip list does not name', () => {
    const paths = withSkipped(() => auditPaths(journeyIds, ROUTES))

    expect(paths).toHaveLength(GET_PATHS.length - SKIPPED_PATH_COUNT)
    expect(paths).not.toContain(
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/uploads/status`
    )
    expect(paths.some((path) => path.includes('{'))).toBe(false)
  })

  it('Should point each route at the notification the filled-by list names and the rest at the default shape', () => {
    const paths = withFilledBy(() => auditPaths(journeyIds, ROUTES))

    expect(
      paths.filter((path) => path.includes(journeyIds.woodWithoutBark))
    ).toEqual([
      `${SET_BASE}/notifications/${journeyIds.woodWithoutBark}/treatments`
    ])
    expect(
      paths.filter((path) => path.includes(journeyIds.warePotatoesLate))
    ).toEqual([
      `${SET_BASE}/notifications/${journeyIds.warePotatoesLate}/late-reason`
    ])
    expect(
      paths.filter((path) => path.includes(journeyIds.plantsForPlanting))
    ).toEqual([
      `${SET_BASE}/notifications/${journeyIds.plantsForPlanting}/arrival-status`,
      `${SET_BASE}/notifications/${journeyIds.plantsForPlanting}/consignors/select`
    ])
    expect(
      paths.filter((path) => path.includes(journeyIds.warePotatoes))
    ).toEqual([
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/origin`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/uploads/status`
    ])
  })

  it('Should carry the query string a route needs before it will render', () => {
    const path = '/notifications/{journeyId}/origin'

    const paths = withEntries(QUERY, [[path, '?change=1']], () =>
      auditPaths(journeyIds, ROUTES)
    )

    expect(paths).toContain(
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/origin?change=1`
    )
  })

  it('Should audit a page the moment the app registers a GET route for it', () => {
    const routes = [
      ...ROUTES,
      { method: 'GET', path: '/notifications/{journeyId}/brand-new' }
    ]

    expect(auditPaths(journeyIds, routes)).toContain(
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/brand-new`
    )
  })

  it('Should refuse to audit a route whose notification shape was never seeded', () => {
    const unseeded = { ...journeyIds, woodWithoutBark: undefined }

    expect(() => withFilledBy(() => auditPaths(unseeded, ROUTES))).toThrow(
      /audits .* on the "woodWithoutBark" notification, which the setup step did not seed/
    )
  })

  it('Should audit every page the set registers today', () => {
    expect(auditPaths(journeyIds)).toEqual([
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/declaration`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/notification-view`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/consignment/contact/select`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/identification-numbers`,
      DASHBOARD_URL_PATH,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/delete`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/commodity-type`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/commodities`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/commodities/details`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/origin`,
      `${SET_BASE}/notifications/${journeyIds.plantsForPlanting}/arrival-status`,
      // Audited on the ware-potato default: the date is asked of every
      // commodity type, and potatoes are the shape that also carries the time
      // and the place of landing, so the audit reads the fullest page.
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/arrival-details`,
      // Audited on the ware-potato default too: the picker is the same page
      // whichever state it asks its question in, and the ware-potato shape is
      // the one that reaches it without an arrival status.
      `${SET_BASE}/notifications/${journeyIds.plantsForPlanting}/consignors/select`,
      `${SET_BASE}/notifications/${journeyIds.warePotatoes}/destinations/select`
    ])
  })
})

describe('#auditableRoutePaths', () => {
  it('Should leave out cancel-amend because no seed shape is amending', () => {
    expect(SKIPPED.get(CANCEL_AMEND_PATH)).toMatch(/amending/)
    expect(auditableRoutePaths()).not.toContain(CANCEL_AMEND_PATH)
  })

  it('Should leave out the confirmation page, which only renders on a submitted notification', () => {
    expect(SKIPPED.get(CONFIRMATION_PATH)).toMatch(/submitted/)
    expect(auditableRoutePaths()).not.toContain(CONFIRMATION_PATH)
  })

  it('Should name every GET route the skip list does not name, journey id unsubstituted', () => {
    const paths = withSkipped(() => auditableRoutePaths(ROUTES))

    expect(paths).toHaveLength(GET_PATHS.length - SKIPPED_PATH_COUNT)
    expect(paths).toContain(TREATMENTS_PATH)
    expect(paths).not.toContain(SKIPPED_PATH)
    expect(paths).not.toContain(CONFIRMATION_PATH)
  })

  it('Should name every GET route the set registers today', () => {
    expect(auditableRoutePaths()).toEqual([
      '/notifications/{journeyId}/declaration',
      '/notifications/{journeyId}/notification-view',
      '/notifications/{journeyId}/consignment/contact/select',
      '/notifications/{journeyId}/identification-numbers',
      DASHBOARD_ROUTE_PATH,
      HUB_PATH,
      DELETE_PATH,
      COMMODITY_TYPE_PATH,
      COMMODITIES_PATH,
      COMMODITY_DETAILS_PATH,
      ORIGIN_PATH,
      ARRIVAL_STATUS_PATH,
      ARRIVAL_DETAILS_PATH,
      CONSIGNOR_PATH,
      PLACE_OF_DESTINATION_PATH
    ])
  })
})

describe('#assertTargetsAreCurrent', () => {
  it('Should pass against a route table the three lists do not contradict', () => {
    expect(() => assertTargetsAreCurrent(ROUTES)).not.toThrow()
  })

  it('Should reject a skip list naming a route the app no longer serves', () => {
    const routes = ROUTES.filter(({ path }) => path !== SKIPPED_PATH)

    expect(() => withSkipped(() => assertTargetsAreCurrent(routes))).toThrow(
      /skip list names .*, which the app no longer serves/
    )
  })

  it('Should reject a filled-by entry naming a route the app no longer serves', () => {
    const routes = ROUTES.filter(({ path }) => path !== TREATMENTS_PATH)

    expect(() => withFilledBy(() => assertTargetsAreCurrent(routes))).toThrow(
      /filled-by list names .*, which the app no longer serves/
    )
  })

  it('Should reject a query entry naming a route the app no longer serves', () => {
    const path = '/notifications/{journeyId}/gone'

    expect(() =>
      withEntries(QUERY, [[path, '?change=1']], () =>
        assertTargetsAreCurrent(ROUTES)
      )
    ).toThrow(/query list names .*, which the app no longer serves/)
  })

  it('Should refuse a new route whose extra path parameter nothing can satisfy', () => {
    const routes = [
      ...ROUTES,
      { method: 'GET', path: '/notifications/{journeyId}/lines/{lineId}' }
    ]

    expect(() => assertTargetsAreCurrent(routes)).toThrow(
      /cannot build a URL for \/notifications\/\{journeyId}\/lines\/\{lineId}/
    )
  })
})

describe('#signInUrl', () => {
  it('Should sign in inside the set, not at the root the chooser serves', () => {
    expect(signInUrl(ORIGIN)).toBe(`${ORIGIN}${SET_BASE}`)
  })

  it('Should not sign in at a page served without authentication', () => {
    expect(signInUrl(ORIGIN)).not.toBe(`${ORIGIN}/`)
  })
})

describe('#reportName', () => {
  it('Should name a report after its route, without the seeded journey id', () => {
    expect(
      reportName(
        `${ORIGIN}${SET_BASE}/notifications/${journeyIds.warePotatoes}/uploads/status`,
        journeyIds
      )
    ).toBe('high_risk_plants_notifications_uploads_status')
  })

  it("Should name the dashboard's report after the set it belongs to", () => {
    expect(reportName(`${ORIGIN}${SET_BASE}`, journeyIds)).toBe(
      'high_risk_plants'
    )
  })

  it('Should name the report for the root, which is the chooser on this host', () => {
    expect(reportName(`${ORIGIN}/`, journeyIds)).toBe('home')
  })

  it('Should keep the set mount so two sets sharing a route get different reports', () => {
    const route = `/notifications/${journeyIds.warePotatoes}/origin`

    expect(reportName(`${ORIGIN}${SET_BASE}${route}`, journeyIds)).not.toBe(
      reportName(`${ORIGIN}${SAMPLE_SET_BASE}${route}`, journeyIds)
    )
  })

  it('Should drop the query string a route needs to render', () => {
    expect(
      reportName(
        `${ORIGIN}${SET_BASE}/notifications/${journeyIds.warePotatoes}/origin?change=1`,
        journeyIds
      )
    ).toBe('high_risk_plants_notifications_origin')
  })
})

describe('#reportNames', () => {
  it('Should give a page the same report name however the notifications are seeded', () => {
    const other = Object.fromEntries(
      Object.keys(journeyIds).map((shape) => [shape, `PHN-27-${shape}`])
    )

    expect(
      Object.values(reportNames(auditUrls(ORIGIN, other, ROUTES), other))
    ).toEqual(
      Object.values(
        reportNames(auditUrls(ORIGIN, journeyIds, ROUTES), journeyIds)
      )
    )
  })

  it('Should name every audited URL without leaking a journey id', () => {
    const urls = withFilledBy(() => auditUrls(ORIGIN, journeyIds, ROUTES))
    const names = reportNames(urls, journeyIds)

    expect(Object.keys(names)).toEqual(urls)
    expect(Object.values(names).filter((name) => name.includes('PHN'))).toEqual(
      []
    )
  })

  it('Should refuse two routes that would overwrite each other', () => {
    const urls = [
      `${ORIGIN}/notifications/${journeyIds.warePotatoes}/origin`,
      `${ORIGIN}/notifications/${journeyIds.seedPotatoes}/origin`
    ]

    expect(() => reportNames(urls, journeyIds)).toThrow(
      /would write both .* to notifications_origin\.report\.html/
    )
  })
})

describe('#SEED_SHAPES', () => {
  it('Should hold one shape per blueprint use case', () => {
    expect(Object.keys(SEED_SHAPES)).toEqual(USE_CASES)
  })

  it('Should open every shape on the commodity type its use case is for', () => {
    expect(
      Object.fromEntries(
        Object.entries(SEED_SHAPES).map(([shape, { steps }]) => [
          shape,
          steps[0]
        ])
      )
    ).toEqual({
      warePotatoes: COMMODITY_TYPE_STEP('potatoes'),
      warePotatoesLate: COMMODITY_TYPE_STEP('potatoes'),
      seedPotatoes: COMMODITY_TYPE_STEP('potatoes'),
      plantsForPlanting: COMMODITY_TYPE_STEP('plants-for-planting'),
      woodWithoutBark: COMMODITY_TYPE_STEP('wood-and-cut-trees')
    })
  })

  it('Should seed only commodity types the journey offers', () => {
    const seeded = Object.values(SEED_SHAPES)
      .flatMap(({ steps }) => steps.map(({ fields }) => fields.commodityType))
      .filter(Boolean)

    expect(seeded).toHaveLength(Object.keys(SEED_SHAPES).length)
    expect(seeded.every((type) => commodityTypes().includes(type))).toBe(true)
  })

  it('Should give every shape a commodity line the list page can read back', () => {
    for (const [shape, { steps }] of Object.entries(SEED_SHAPES)) {
      const lineSteps = steps.filter(
        (step) => step.slug === COMMODITY_DETAILS_SLUG
      )

      expect(lineSteps, shape).toHaveLength(2)
      expect(lineSteps[0].fields.category, shape).toBeTruthy()
      expect(lineSteps[1].fields.index, shape).toBe('0')
      expect(
        Object.keys(lineSteps[1].fields)
          .filter((field) => field !== 'index' && field !== 'category')
          .toSorted(),
        shape
      ).toEqual([...lineFieldsFor(lineSteps[1].fields.category)].toSorted())
    }
  })

  it('Should seed only categories the shape’s own commodity type allows', () => {
    for (const [shape, { steps }] of Object.entries(SEED_SHAPES)) {
      const commodityType = steps[0].fields.commodityType
      const seededCategories = steps
        .map(({ fields }) => fields.category)
        .filter(Boolean)

      for (const category of seededCategories) {
        expect(categoriesFor(commodityType), shape).toContain(category)
      }
    }
  })

  it('Should seed only origin countries the shape’s own lines allow', async () => {
    // countryOfOrigin is enforced at Continue, so a shape whose use case
    // reaches a page after origin has to answer it — and the answer has to
    // survive the narrowing its own categories impose.
    const offered = (await originCountries()).map(({ value }) => value)
    for (const [shape, { steps }] of Object.entries(SEED_SHAPES)) {
      for (const step of steps.filter(({ slug }) => slug === ORIGIN_SLUG)) {
        const categories = steps
          .map(({ fields }) => fields.category)
          .filter(Boolean)

        expect(
          offered,
          `${shape}: ${step.fields.countryOfOrigin} is not a country the origin page offers`
        ).toContain(step.fields.countryOfOrigin)

        for (const category of categories) {
          const allowed = originCountriesFor(category)
          expect(
            allowed.length === 0 ||
              allowed.includes(step.fields.countryOfOrigin),
            `${shape}: ${step.fields.countryOfOrigin} is outside what ${category} allows`
          ).toBe(true)
        }
      }
    }
  })

  it('Should seed an origin on the shape the arrival-status audit reads', () => {
    const shape = FILLED_BY.get(ARRIVAL_STATUS_PATH)

    expect(
      SEED_SHAPES,
      'the arrival-status audit names a shape the seed does not hold'
    ).toHaveProperty(shape)
    expect(
      SEED_SHAPES[shape].steps.some(({ slug }) => slug === ORIGIN_SLUG),
      'arrival-status sits after origin, so its audited shape needs a country'
    ).toBe(true)
  })
})

describe('#journeyIdIn', () => {
  it('Should read the journey id from a redirect to the first journey page', () => {
    expect(
      journeyIdIn(`${SET_BASE}/notifications/PHN-26-0001/commodity-type`)
    ).toBe('PHN-26-0001')
  })

  it('Should read the journey id from a redirect to the hub', () => {
    expect(journeyIdIn(`${SET_BASE}/notifications/PHN-26-0001`)).toBe(
      'PHN-26-0001'
    )
  })

  it('Should read no journey id from a redirect somewhere else', () => {
    expect(journeyIdIn('/')).toBe('')
  })
})
