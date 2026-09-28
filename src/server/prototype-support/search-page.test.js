import { describe, expect, it } from 'vitest'

import {
  haystackOf,
  idFromName,
  PAGE_SIZE,
  pageOf,
  searchRecords
} from './search-page.js'

const numbered = (count) =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    name: `Row ${index + 1}`
  }))

describe('#pageOf', () => {
  it('Should answer in the address book picker shape', () => {
    expect(pageOf(numbered(7), 2)).toEqual({
      results: [
        { id: 'row-6', name: 'Row 6' },
        { id: 'row-7', name: 'Row 7' }
      ],
      total: 7,
      page: 2,
      totalPages: 2,
      pageSize: PAGE_SIZE
    })
  })

  it('Should fall back to the first page for a page out of range', () => {
    expect(pageOf(numbered(3), 9).page).toBe(1)
    expect(pageOf(numbered(3), Number.NaN).page).toBe(1)
  })

  it('Should report one empty page when nothing matches', () => {
    expect(pageOf([], 1)).toMatchObject({
      results: [],
      total: 0,
      page: 1,
      totalPages: 1
    })
  })
})

describe('#searchRecords', () => {
  const records = [
    { id: 'a', name: 'Harbour Haulage', address: { townOrCity: 'Felixstowe' } },
    { id: 'b', name: 'Fenland Growers', address: { townOrCity: 'Wisbech' } }
  ]
  const fields = (record) => [record.name, record.address]

  it('Should match the name or any address line, ignoring case', () => {
    expect(
      searchRecords(records, fields, { query: 'WISBECH' }).results
    ).toEqual([records[1]])
    expect(
      searchRecords(records, fields, { query: ' harbour ' }).results
    ).toEqual([records[0]])
  })

  it('Should list everything for an empty search', () => {
    expect(searchRecords(records, fields, { query: '' }).total).toBe(2)
  })
})

describe('#haystackOf', () => {
  it('Should join strings and nested values, skipping empty ones', () => {
    expect(haystackOf(['Name', { line: 'Street', blank: '' }, null, 7])).toBe(
      'name street'
    )
  })
})

describe('#idFromName', () => {
  it('Should make a readable id and never reuse one', () => {
    const taken = new Set(['quick-haulage-ltd'])

    expect(idFromName('Quick Haulage Ltd', new Set())).toBe('quick-haulage-ltd')
    expect(idFromName('Quick Haulage Ltd', taken)).toBe('quick-haulage-ltd-2')
    expect(idFromName('!!!', new Set())).toBe('record')
  })
})
