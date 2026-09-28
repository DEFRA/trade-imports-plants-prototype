import { describe, expect, it } from 'vitest'

import {
  knownKeys,
  pageKey,
  planWalk,
  resolvePageName,
  resolveWanted
} from './targets.js'

const page = (id, slug) => ({ id, slug })

/** The shape of high-risk-plants' flow, as pagesOf returns it. */
const PAGES = [
  page('dashboard', ''),
  page('commodityType', 'commodity-type'),
  page('commodities', 'commodities'),
  page('commodityDetails', 'commodities/details'),
  page('origin', 'origin'),
  page('arrivalStatus', 'arrival-status'),
  page('arrivalDetails', 'arrival-details'),
  page('consignor', 'consignors/select'),
  page('notificationView', 'notification-view'),
  page('declaration', 'declaration'),
  page('confirmation', 'confirmation')
]

const steps = (...slugs) => slugs.map((slug) => ({ slug, fields: {} }))

const SCENARIOS = [
  {
    name: 'warePotatoes',
    steps: steps(
      'commodity-type',
      'commodities/details',
      'commodities/details',
      'commodities',
      'origin',
      'arrival-details'
    )
  },
  {
    name: 'plantsForPlanting',
    steps: steps(
      'commodity-type',
      'commodities/details',
      'commodities/details',
      'commodities',
      'origin',
      'arrival-status',
      'arrival-details',
      'consignors/select'
    )
  }
]

describe('pageKey', () => {
  it('Should name a page by its address, or by its id when it has none', () => {
    expect(pageKey(page('origin', 'origin'))).toBe('origin')
    expect(pageKey(page('dashboard', ''))).toBe('dashboard')
    expect(pageKey({ id: 'hub', slug: null })).toBe('hub')
  })
})

describe('knownKeys', () => {
  it('Should put the hub straight after the last page an example fills in', () => {
    expect(knownKeys(PAGES, SCENARIOS)).toEqual([
      'dashboard',
      'commodity-type',
      'commodities',
      'commodities/details',
      'origin',
      'arrival-status',
      'arrival-details',
      'consignors/select',
      'hub',
      'notification-view',
      'declaration',
      'confirmation'
    ])
  })

  it('Should leave the hub out of a set with no examples', () => {
    expect(knownKeys([page('welcome', 'welcome')], [])).toEqual(['welcome'])
  })
})

describe('resolvePageName', () => {
  it.each([
    ['arrival-details', 'arrival-details'],
    ['/origin/', 'origin'],
    ['arrivalDetails', 'arrival-details'],
    ['commodities-details', 'commodities/details'],
    ['check-answers', 'notification-view'],
    ['task-list', 'hub'],
    ['home', 'dashboard']
  ])('Should read "%s" as %s', (name, key) => {
    expect(resolvePageName(name, PAGES, SCENARIOS)).toBe(key)
  })

  it('Should answer null for a page the set does not have', () => {
    expect(resolvePageName('transporter', PAGES, SCENARIOS)).toBeNull()
  })
})

describe('resolveWanted', () => {
  const context = {
    pages: PAGES,
    scenarios: SCENARIOS,
    setId: 'plants-working',
    changedKeys: ['origin', 'hub']
  }

  it('Should give every page for all', () => {
    expect(resolveWanted({ mode: 'all', keys: [] }, context).keys).toEqual(
      knownKeys(PAGES, SCENARIOS)
    )
  })

  it('Should give the changed pages, in journey order', () => {
    expect(resolveWanted({ mode: 'changed', keys: [] }, context)).toEqual({
      keys: ['origin', 'hub'],
      problems: []
    })
  })

  it('Should add named pages to the changed ones', () => {
    expect(
      resolveWanted({ mode: 'changed', keys: ['dashboard'] }, context)
    ).toEqual({ keys: ['dashboard', 'origin', 'hub'], problems: [] })
  })

  it('Should give named pages in journey order and explain unknown names', () => {
    expect(
      resolveWanted(
        { mode: 'list', keys: ['confirmation', 'origin', 'transporter'] },
        context
      )
    ).toEqual({
      keys: ['origin', 'confirmation'],
      problems: [
        `There is no page called "transporter" in plants-working. Its pages are: ${knownKeys(PAGES, SCENARIOS).join(', ')}.`
      ]
    })
  })
})

describe('planWalk', () => {
  it('Should reach one page with the first example that fills it in', () => {
    expect(
      planWalk({
        pages: PAGES,
        scenarios: SCENARIOS,
        wanted: ['arrival-details']
      })
    ).toEqual({
      landing: { key: 'dashboard', capture: false },
      runs: [
        {
          scenario: 'warePotatoes',
          captures: [
            { key: 'arrival-details', index: 5, as: 'arrival-details' }
          ],
          finish: false,
          suffix: ''
        }
      ],
      hub: false,
      after: [],
      eachExample: false,
      unreached: [],
      neverReached: []
    })
  })

  it('Should picture a page once per example that reaches it with --each-example', () => {
    const plan = planWalk({
      pages: PAGES,
      scenarios: SCENARIOS,
      wanted: ['arrival-details', 'arrival-status'],
      eachExample: true
    })
    expect(plan.runs).toEqual([
      {
        scenario: 'warePotatoes',
        captures: [
          {
            key: 'arrival-details',
            index: 5,
            as: 'arrival-details@warePotatoes'
          }
        ],
        finish: false,
        suffix: '@warePotatoes'
      },
      {
        scenario: 'plantsForPlanting',
        captures: [
          { key: 'arrival-status', index: 5, as: 'arrival-status' },
          {
            key: 'arrival-details',
            index: 6,
            as: 'arrival-details@plantsForPlanting'
          }
        ],
        finish: false,
        suffix: '@plantsForPlanting'
      }
    ])
  })

  it('Should finish every example for check your answers with --each-example', () => {
    const plan = planWalk({
      pages: PAGES,
      scenarios: SCENARIOS,
      wanted: ['notification-view'],
      eachExample: true
    })
    expect(plan.runs.map((run) => [run.scenario, run.finish])).toEqual([
      ['warePotatoes', true],
      ['plantsForPlanting', true]
    ])
  })

  it('Should finish the first example when an address needs its notification', () => {
    const plan = planWalk({
      pages: PAGES,
      scenarios: SCENARIOS,
      wanted: [],
      finish: true
    })
    expect(plan.runs).toEqual([
      { scenario: 'warePotatoes', captures: [], finish: true, suffix: '' }
    ])
  })

  it('Should use a later example for a page only it fills in', () => {
    const plan = planWalk({
      pages: PAGES,
      scenarios: SCENARIOS,
      wanted: ['arrival-status', 'origin']
    })
    expect(plan.runs).toEqual([
      {
        scenario: 'warePotatoes',
        captures: [{ key: 'origin', index: 4, as: 'origin' }],
        finish: false,
        suffix: ''
      },
      {
        scenario: 'plantsForPlanting',
        captures: [{ key: 'arrival-status', index: 5, as: 'arrival-status' }],
        finish: false,
        suffix: ''
      }
    ])
  })

  it('Should finish the first example to reach the hub and the pages after it', () => {
    const plan = planWalk({
      pages: PAGES,
      scenarios: SCENARIOS,
      wanted: ['hub', 'declaration', 'dashboard']
    })
    expect(plan.runs).toEqual([
      { scenario: 'warePotatoes', captures: [], finish: true, suffix: '' }
    ])
    expect(plan.hub).toBe(true)
    expect(plan.after).toEqual([
      { key: 'notification-view', capture: false },
      { key: 'declaration', capture: true }
    ])
    expect(plan.landing).toEqual({ key: 'dashboard', capture: true })
  })

  it('Should list pages no example reaches', () => {
    const pages = [
      ...PAGES.slice(0, 5),
      page('transporter', 'transporter'),
      ...PAGES.slice(5)
    ]
    const plan = planWalk({
      pages,
      scenarios: SCENARIOS,
      wanted: ['transporter', 'origin']
    })
    expect(plan.unreached).toEqual(['transporter'])
    expect(plan.neverReached).toEqual(['transporter'])
  })

  it('Should only show the landing page for a set with no examples', () => {
    const pages = [page('welcome', 'welcome'), page('second', 'second')]
    expect(
      planWalk({ pages, scenarios: [], wanted: ['welcome', 'second'] })
    ).toEqual({
      landing: { key: 'welcome', capture: true },
      runs: [],
      hub: false,
      after: [],
      eachExample: false,
      unreached: ['second'],
      neverReached: ['second']
    })
  })
})
