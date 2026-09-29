import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync
} from 'node:fs'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { copySetFiles, planCopy } from '../../new-set/copy-set.js'
import { REPO_ROOT } from '../../designer/lib/repo.js'
import { buildGraph, serialiseGraph } from './graph.js'
import { installSet } from './install-set.js'

const APP = 'src/server/app'
const REAL = 'high-risk-plants'
const COMMODITY_TYPE = '“What are you importing?”'

const edgesFrom = (graph, from, kind) =>
  graph.edges.filter((edge) => edge.from === from && edge.kind === kind)

const pageOf = (graph, id) => graph.pages.find((page) => page.id === id)

describe('the high-risk plants service map', () => {
  let graph

  beforeAll(async () => {
    graph = await buildGraph(REAL)
  })

  it('Should find the one answer that changes the route, with the labels its page offers', () => {
    expect(graph.decisions).toEqual([
      {
        id: 'commodityType',
        obligation: 'commodityType',
        question: 'What are you importing?',
        page: 'commodity-type',
        values: [
          { value: 'potatoes', label: 'Potatoes (seed or ware)' },
          { value: 'plants-for-planting', label: 'Plants for planting' },
          { value: 'wood-and-cut-trees', label: 'Wood and cut trees' }
        ]
      }
    ])
    expect(graph.counts.obligations).toBe(25)
  })

  it('Should branch after the origin page on what is being imported', () => {
    expect(
      edgesFrom(graph, 'origin', 'first-pass').map((edge) => [
        edge.to,
        edge.condition?.text
      ])
    ).toEqual([
      [
        'arrival-status',
        `If ${COMMODITY_TYPE} is “Plants for planting” or “Wood and cut trees”`
      ],
      ['arrival-details', `If ${COMMODITY_TYPE} is “Potatoes (seed or ware)”`]
    ])
  })

  it('Should skip the consignor for potatoes, on the first pass and on the task list', () => {
    expect(
      edgesFrom(graph, 'place-of-destination', 'first-pass').map((edge) => [
        edge.to,
        edge.condition?.values
      ])
    ).toEqual([
      [
        'consignor-select',
        { commodityType: ['plants-for-planting', 'wood-and-cut-trees'] }
      ],
      ['identification-numbers', { commodityType: ['potatoes'] }]
    ])
    const consignorRow = graph.lanes
      .flatMap((lane) => lane.rows)
      .find((row) => row.id === 'consignor')
    expect(consignorRow.conditional).toBe(true)
    expect(consignorRow.shownWhen.values).toEqual({
      commodityType: ['plants-for-planting', 'wood-and-cut-trees']
    })
  })

  it('Should end the opening run at the task list, and open check your answers from it only when every task is complete', () => {
    expect(
      edgesFrom(graph, 'consignment-contact-select', 'first-pass')
    ).toEqual([
      {
        from: 'consignment-contact-select',
        to: 'hub',
        kind: 'first-pass',
        condition: null
      }
    ])
    const review = edgesFrom(graph, 'hub', 'task-list').find(
      (edge) => edge.row === 'review'
    )
    expect(review.to).toBe('notification-view')
    expect(review.condition.text).toBe('If every task is complete')
    expect(pageOf(graph, 'notification-view').shownWhen.when).toBe(
      'every task is complete'
    )
  })

  it('Should go on from check your answers to the declaration and end at confirmation', () => {
    expect(edgesFrom(graph, 'notification-view', 'continue')[0].to).toBe(
      'declaration'
    )
    expect(edgesFrom(graph, 'declaration', 'continue')[0].to).toBe(
      'confirmation'
    )
    expect(graph.ends).toEqual(['confirmation'])
    expect(graph.edges.filter((edge) => edge.from === 'confirmation')).toEqual(
      []
    )
  })

  it('Should draw the commodity details page as opened from the list page, not reached by Continue', () => {
    expect(
      graph.edges.filter((edge) => edge.to === 'commodity-details')
    ).toEqual([
      expect.objectContaining({
        from: 'commodities',
        kind: 'within-task',
        condition: null
      })
    ])
  })

  it('Should say which questions each page asks, and when', () => {
    const commodities = pageOf(graph, 'commodities')
    expect(commodities.fulfils.map((item) => item.name)).toContain('genus')
    expect(
      commodities.fulfils.find((item) => item.name === 'genus').label
    ).toBe('Genus')
    expect(
      commodities.fieldConditions.find((field) => field.field === 'species')
        .text
    ).toBe(
      'Species: asked when the category is “Plants for planting” or “Trees for planting”'
    )
    expect(pageOf(graph, 'commodity-details').fulfils).toEqual([])
    const time = pageOf(graph, 'arrival-details').fulfils.find(
      (item) => item.name === 'arrivalTime'
    )
    expect(time.askedWhen.values).toEqual({ commodityType: ['potatoes'] })
  })

  it('Should take every title from the pages’ own copy, leave no page unreached and prove the model', () => {
    expect(graph.pages.filter((page) => page.titleSource !== 'copy')).toEqual(
      []
    )
    expect(pageOf(graph, 'hub').title).toBe('Overview')
    expect(graph.unreachedPages).toEqual([])
    expect(
      graph.edges.filter((edge) => edge.condition?.kind === 'opaque')
    ).toEqual([])
    expect(graph.proofs).toEqual({
      dependencyGraph: 'proved',
      unreachableObligations: [],
      gateErrors: [],
      flowReachability: [],
      scopeCompleteness: []
    })
    expect(graph.outsideTheFlow.map((page) => page.title)).toEqual([
      'Cancel this amendment?',
      'Delete this notification?'
    ])
  })

  it('Should give the same bytes every time, with no path or date in them', async () => {
    const again = await buildGraph(REAL)
    const bytes = serialiseGraph(graph)
    expect(serialiseGraph(again)).toBe(bytes)
    expect(bytes).not.toContain(REPO_ROOT)
    expect(bytes).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)
  })

  it('Should leave only the request-time seams unconfigured, so a new platform seam fails here rather than mis-drawing the map', async () => {
    const inst = await installSet(REAL)
    expect(inst.platform.setContext.unconfiguredSeamsOf(REAL)).toEqual([
      'session (configureSession)',
      'records (configureRecords)'
    ])
  })
})

describe('a design release copied from the real journey', () => {
  const RELEASE = 'plants-map-copy'
  let root

  beforeAll(() => {
    const cache = path.join(REPO_ROOT, '.cache', 'service-map-tests')
    mkdirSync(cache, { recursive: true })
    root = mkdtempSync(path.join(cache, 'release-'))
    const appDir = path.join(root, APP)
    mkdirSync(path.join(appDir, 'sets'), { recursive: true })
    // Everything but the sets is the real checkout's, linked in: only the
    // release is a copy.
    for (const [folder, own] of [
      ['src', 'server'],
      ['src/server', 'app'],
      [APP, 'sets']
    ]) {
      for (const entry of readdirSync(path.join(REPO_ROOT, folder))) {
        if (entry !== own) {
          symlinkSync(
            path.join(REPO_ROOT, folder, entry),
            path.join(root, folder, entry)
          )
        }
      }
    }
    const sourceDir = path.join(REPO_ROOT, APP, 'sets', REAL)
    const { keep } = planCopy(sourceDir, {
      fromId: REAL,
      routesFile: path.join(REPO_ROOT, APP, `routes-${REAL}.js`),
      purpose: 'working'
    })
    copySetFiles(sourceDir, path.join(appDir, 'sets', RELEASE), keep, {
      fromId: REAL,
      newId: RELEASE,
      uuidMap: new Map()
    })
  })

  afterAll(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('Should map the release from its own files, with no code written for it', async () => {
    const release = await buildGraph(RELEASE, { root })
    const real = await buildGraph(REAL)
    expect(release.set).toEqual({
      id: RELEASE,
      title: 'Plants map copy',
      kind: 'release',
      frozen: false
    })
    expect(release.pages.map((page) => page.id)).toEqual(
      real.pages.map((page) => page.id)
    )
    expect(
      release.edges.map((edge) => [edge.from, edge.to, edge.condition?.text])
    ).toEqual(
      real.edges.map((edge) => [edge.from, edge.to, edge.condition?.text])
    )
  })
})

describe('the placeholder set', () => {
  it('Should map its one page with no hub and no branches', async () => {
    const graph = await buildGraph('sample-journey')
    expect(graph.pages.map((page) => page.id)).toEqual(['welcome'])
    expect(graph.edges).toEqual([])
    expect(graph.pages[0].titleSource).toBe('guessed')
    expect(graph.outsideTheFlow.map((page) => page.route)).toContain(
      '/transporters'
    )
  })
})
