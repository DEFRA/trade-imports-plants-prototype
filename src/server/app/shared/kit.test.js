import { describe, expect, it } from 'vitest'

import {
  CAPTIONS,
  itemDetailPage,
  itemsPage
} from '../../../../test/fixtures/index.js'
import { base, dateField } from './kit.js'

describe('#base — the section caption the installed journey names', () => {
  it('Should carry the caption of a page the journey captions', () => {
    expect(base('any title', { page: itemDetailPage }).caption).toBe(
      CAPTIONS.itemDetail
    )
  })

  it('Should leave the caption undefined for a page the journey leaves bare', () => {
    expect(base('any title', { page: itemsPage }).caption).toBeUndefined()
  })

  it('Should leave the caption undefined when no page identity is supplied', () => {
    expect(base('any title').caption).toBeUndefined()
  })
})

describe('#dateField — MoJ date-picker view model', () => {
  it('Should carry supplied bounds through verbatim so the macro emits the restriction attributes', () => {
    const field = dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      value: { day: '3', month: '1', year: '2027' },
      minDate: '5/8/2026',
      maxDate: '12/2/2027'
    })

    expect(field.minDate).toBe('5/8/2026')
    expect(field.maxDate).toBe('12/2/2027')
    expect(field.value).toBe('3/1/2027')
  })

  it('Should leave both bounds undefined when none are supplied, so an unrestricted picker stays unrestricted', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.minDate).toBeUndefined()
    expect(field.maxDate).toBeUndefined()
  })

  it('Should carry form-group classes through, so a stylesheet can reach one picker rather than all of them', () => {
    const field = dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      formGroupClasses: 'app-date-picker'
    })

    expect(field.formGroup).toEqual({ classes: 'app-date-picker' })
  })

  it('Should leave the form group undefined when no classes are supplied, so the macro emits the default markup', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.formGroup).toBeUndefined()
  })
})
