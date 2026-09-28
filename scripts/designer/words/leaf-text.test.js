import { describe, expect, it } from 'vitest'

import { leafText, valueAt, welshStatus } from './leaf-text.js'

describe('leafText', () => {
  it('Should give a string as it is', () => {
    expect(leafText('Arrival details')).toBe('Arrival details')
  })

  it('Should give a copy function as its template, placeholders kept', () => {
    const warning = (days) => `Submit ${days} days before arrival.`
    expect(leafText(warning)).toBe(
      ['Submit ', '$', '{days} days before arrival.'].join('')
    )
  })
})

describe('welshStatus', () => {
  it('Should see the marker', () => {
    expect(welshStatus('Arrival', '[Welsh needed] Arrival')).toBe('marked')
  })

  it('Should see Welsh that is the same as the English', () => {
    expect(welshStatus('Arrival', 'Arrival')).toBe('same-as-english')
  })

  it('Should see Welsh that is missing', () => {
    expect(welshStatus('Arrival', undefined)).toBe('missing')
  })

  it('Should see translated Welsh', () => {
    expect(welshStatus('Arrival', 'Cyrraedd')).toBe('translated')
  })
})

describe('valueAt', () => {
  it('Should follow a dotted key path', () => {
    expect(valueAt({ a: { 'b-c': 'x' } }, 'a.b-c')).toBe('x')
  })

  it('Should answer undefined for a path that is not there', () => {
    expect(valueAt({ a: 'x' }, 'a.b')).toBeUndefined()
    expect(valueAt(undefined, 'a')).toBeUndefined()
  })
})
