import { describe, expect, it, vi } from 'vitest'

import { registerFake } from '../lib/registry.js'
import { designerRecords, designerRecordsFor } from './index.js'

const RELEASE = 'plants-wrap-test'
const UPSTREAM_PAGE_SIZE = 2
const ROSA = 'Rosa canina'

const ROWS = [
  {
    journeyId: 'GBN-1',
    status: 'draft',
    commodity: { name: ROSA },
    arrivalDate: '2026-10-01',
    lateNotificationIndicator: false
  },
  {
    journeyId: 'GBN-2',
    status: 'submitted',
    commodity: { name: 'Malus domestica' },
    arrivalDate: '2026-10-05',
    lateNotificationIndicator: true
  },
  {
    journeyId: 'GBN-3',
    status: 'amend',
    commodity: { name: 'Rosa gallica' },
    arrivalDate: '2026-09-20',
    lateNotificationIndicator: false
  },
  {
    journeyId: 'GBN-4',
    status: 'submitted',
    commodity: null,
    arrivalDate: null,
    lateNotificationIndicator: false
  },
  {
    journeyId: 'GBN-5',
    status: 'draft',
    commodity: { name: 'ROSA x alba' },
    arrivalDate: '2026-11-01',
    lateNotificationIndicator: true
  }
]

/** A stand-in for the upstream records store: pages of two, in a fixed order. */
const upstreamRecords = () => ({
  list: vi.fn(async ({ page = 1 } = {}) => {
    const offset = (page - 1) * UPSTREAM_PAGE_SIZE
    return {
      rows: structuredClone(ROWS.slice(offset, offset + UPSTREAM_PAGE_SIZE)),
      page,
      size: UPSTREAM_PAGE_SIZE,
      totalElements: ROWS.length,
      totalPages: Math.ceil(ROWS.length / UPSTREAM_PAGE_SIZE)
    }
  }),
  load: vi.fn(async () => ({ journeyId: 'GBN-1' })),
  has: vi.fn(async () => true),
  create: vi.fn(async () => ({ journeyId: 'GBN-NEW' })),
  replaceFulfilment: vi.fn(async () => ({})),
  finalise: vi.fn(async () => ({})),
  amend: vi.fn(async () => ({})),
  cancelAmend: vi.fn(async () => ({})),
  copy: vi.fn(async () => ({})),
  softDelete: vi.fn(async () => ({})),
  clear: vi.fn(async () => {})
})

const idsOf = (listed) => listed.rows.map((row) => row.journeyId)

/** Every id a filtered list holds, reading each of its pages in turn. */
const allIds = async (wrapped, options) => {
  const first = await wrapped.list({ ...options, page: 1 })
  const ids = idsOf(first)
  for (let page = 2; page <= first.totalPages; page += 1) {
    ids.push(...idsOf(await wrapped.list({ ...options, page })))
  }
  return ids
}

const wrap = (options = {}) => {
  const upstream = upstreamRecords()
  const wrapped = designerRecords(RELEASE, upstream, {
    persist: false,
    ...options
  })
  return { upstream, wrapped }
}

describe('#designerRecords list', () => {
  it('Should hand an unfiltered list straight to the upstream store', async () => {
    const { upstream, wrapped } = wrap()
    const options = { journeyIds: ['GBN-1'], page: 2, sort: 'arrivalDate,asc' }

    const listed = await wrapped.list(options)

    expect(upstream.list).toHaveBeenCalledExactlyOnceWith(options)
    expect(listed.page).toBe(2)
  })

  it('Should filter by one status or several, across every upstream page', async () => {
    const { wrapped } = wrap()

    expect(await allIds(wrapped, { status: 'submitted' })).toEqual([
      'GBN-2',
      'GBN-4'
    ])
    expect(await allIds(wrapped, { status: ['draft', 'amend'] })).toEqual([
      'GBN-1',
      'GBN-3',
      'GBN-5'
    ])
  })

  it('Should filter by commodity text, ignoring case', async () => {
    const { wrapped } = wrap()

    expect(await allIds(wrapped, { commodity: 'rosa' })).toEqual([
      'GBN-1',
      'GBN-3',
      'GBN-5'
    ])
  })

  it('Should filter to late or to on-time notifications', async () => {
    const { wrapped } = wrap()

    expect(await allIds(wrapped, { late: true })).toEqual(['GBN-2', 'GBN-5'])
    expect(await allIds(wrapped, { late: 'no' })).toEqual([
      'GBN-1',
      'GBN-3',
      'GBN-4'
    ])
  })

  it('Should filter by arrival date, leaving out notifications with no date', async () => {
    const { wrapped } = wrap()

    expect(
      await allIds(wrapped, { dateFrom: '2026-10-01', dateTo: '2026-10-31' })
    ).toEqual(['GBN-1', 'GBN-2'])
    expect(await allIds(wrapped, { dateTo: '2026-09-30' })).toEqual(['GBN-3'])
  })

  it('Should filter by tab, with the default tabs or the release’s own', async () => {
    const { wrapped } = wrap()
    const { wrapped: withOwnTabs } = wrap({
      tabs: { inProgress: ['draft', 'amend'] }
    })

    expect(await allIds(wrapped, { tab: 'amended' })).toEqual(['GBN-3'])
    expect(await allIds(wrapped, { tab: 'all' })).toHaveLength(ROWS.length)
    expect(await allIds(withOwnTabs, { tab: 'inProgress' })).toEqual([
      'GBN-1',
      'GBN-3',
      'GBN-5'
    ])
  })

  it('Should page the filtered rows in the upstream list shape', async () => {
    const { wrapped } = wrap()

    const secondPage = await wrapped.list({ commodity: 'rosa', page: 2 })

    expect(secondPage).toEqual({
      rows: [expect.objectContaining({ journeyId: 'GBN-5' })],
      page: 2,
      size: UPSTREAM_PAGE_SIZE,
      totalElements: 3,
      totalPages: 2
    })
  })
})

describe('#designerRecords counts', () => {
  it('Should count by status, late and tab', async () => {
    const { wrapped } = wrap()

    expect(await wrapped.counts({})).toEqual({
      total: 5,
      byStatus: { draft: 2, submitted: 2, amend: 1 },
      late: 2,
      byTab: { all: 5, drafts: 2, submitted: 2, amended: 1 }
    })
  })

  it('Should apply every filter except status and tab, so each tab keeps its own number', async () => {
    const { wrapped } = wrap()

    const counts = await wrapped.counts({
      commodity: 'rosa',
      status: 'submitted',
      tab: 'drafts'
    })

    expect(counts.total).toBe(3)
    expect(counts.byTab).toEqual({
      all: 3,
      drafts: 2,
      submitted: 0,
      amended: 1
    })
  })
})

describe('#designerRecords pass-through and Reset', () => {
  it('Should keep every upstream method and its answers', async () => {
    const { upstream, wrapped } = wrap()

    expect(await wrapped.create('actor')).toEqual({ journeyId: 'GBN-NEW' })
    expect(await wrapped.load({ journeyId: 'GBN-1' })).toEqual({
      journeyId: 'GBN-1'
    })
    expect(upstream.create).toHaveBeenCalledWith('actor')
    expect(wrapped.persistence).toEqual({ enabled: false, file: null })
  })

  it('Should clear the records and every fake service for its own set on Reset', async () => {
    const clearFake = vi.fn()
    registerFake({
      name: 'wrap-test-fake',
      needsARealService: 'Nothing real.',
      clear: clearFake
    })
    const { upstream, wrapped } = wrap()

    await wrapped.clear()

    expect(upstream.clear).toHaveBeenCalledTimes(1)
    expect(clearFake).toHaveBeenCalledWith(RELEASE)
  })
})

describe('#designerRecordsFor', () => {
  it('Should find the wrapped store of a release', () => {
    const { wrapped } = wrap()

    expect(designerRecordsFor(RELEASE)).toBe(wrapped)
  })

  it('Should say how to wire a release that was never wrapped', () => {
    expect(() => designerRecordsFor('plants-never-wrapped')).toThrow(
      'In src/server/app/routes-plants-never-wrapped.js, change configureRecords(SET_ID, records) to configureRecords(SET_ID, designerRecords(SET_ID, records)).'
    )
  })
})
