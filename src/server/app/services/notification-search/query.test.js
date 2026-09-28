import { describe, expect, it } from 'vitest'

import { FILTER_ERRORS, filtersFromQuery } from './query.js'

describe('#filtersFromQuery', () => {
  it('Should read nothing from an empty query', () => {
    expect(filtersFromQuery({})).toEqual({
      filters: {
        status: [],
        commodity: '',
        late: '',
        dateFrom: null,
        dateTo: null,
        tab: ''
      },
      values: {
        status: [],
        commodity: '',
        late: '',
        dateFrom: { day: '', month: '', year: '' },
        dateTo: { day: '', month: '', year: '' },
        tab: ''
      },
      errors: {},
      active: false
    })
  })

  it('Should read one status or several, and drop statuses that do not exist', () => {
    expect(filtersFromQuery({ status: 'draft' }).filters.status).toEqual([
      'draft'
    ])
    expect(
      filtersFromQuery({ status: ['submitted', 'deleted', 'amend'] }).filters
        .status
    ).toEqual(['submitted', 'amend'])
  })

  it('Should read dates sent by govukDateInput and as YYYY-MM-DD', () => {
    const { filters, errors, active } = filtersFromQuery({
      'dateFrom-day': '1',
      'dateFrom-month': '9',
      'dateFrom-year': '2026',
      dateTo: '2026-09-30'
    })

    expect(filters.dateFrom).toBe('2026-09-01')
    expect(filters.dateTo).toBe('2026-09-30')
    expect(errors).toEqual({})
    expect(active).toBe(true)
  })

  it('Should report a date that is not real, and not filter by it', () => {
    const { filters, values, errors } = filtersFromQuery({
      'dateFrom-day': '31',
      'dateFrom-month': '2',
      'dateFrom-year': '2026'
    })

    expect(errors).toEqual({ dateFrom: FILTER_ERRORS.INVALID_DATE })
    expect(filters.dateFrom).toBeNull()
    expect(values.dateFrom).toEqual({ day: '31', month: '2', year: '2026' })
  })

  it('Should report a "to" date before the "from" date, and drop the range', () => {
    const { filters, errors } = filtersFromQuery({
      dateFrom: '2026-10-10',
      dateTo: '2026-10-01'
    })

    expect(errors).toEqual({ dateTo: FILTER_ERRORS.TO_BEFORE_FROM })
    expect(filters.dateFrom).toBeNull()
    expect(filters.dateTo).toBeNull()
  })

  it('Should read late, commodity and a known tab, and ignore an unknown tab', () => {
    const read = filtersFromQuery({
      late: 'yes',
      commodity: ' Rosa ',
      tab: 'drafts'
    })

    expect(read.filters).toMatchObject({
      late: 'yes',
      commodity: 'Rosa',
      tab: 'drafts'
    })
    expect(filtersFromQuery({ tab: 'archive' }).filters.tab).toBe('')
    expect(
      filtersFromQuery({ tab: 'archive' }, { tabs: { archive: [] } }).filters
        .tab
    ).toBe('archive')
  })

  it('Should not count the tab alone as an active filter', () => {
    expect(filtersFromQuery({ tab: 'drafts' }).active).toBe(false)
  })
})
