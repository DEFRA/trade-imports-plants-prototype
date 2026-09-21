import { describe, it, expect } from 'vitest'

import { isBlankValue } from './is-blank-value.js'

describe('isBlankValue', () => {
  it('treats undefined and null as blank', () => {
    expect(isBlankValue(undefined)).toBe(true)
    expect(isBlankValue(null)).toBe(true)
  })

  it('treats empty and whitespace-only strings as blank', () => {
    expect(isBlankValue('')).toBe(true)
    expect(isBlankValue(' ')).toBe(true)
    expect(isBlankValue('a')).toBe(false)
  })

  it('treats an array as blank when every nested value is blank', () => {
    expect(isBlankValue([])).toBe(true)
    expect(isBlankValue(['', { nested: ['   ', null] }])).toBe(true)
    expect(isBlankValue(['a'])).toBe(false)
  })

  it('treats empty object as blank', () => {
    expect(isBlankValue({})).toBe(true)
  })

  it('treats a composite with every sub-field blank as blank', () => {
    expect(
      isBlankValue({
        partOne: '',
        partTwo: '',
        partThree: '',
        partFour: ''
      })
    ).toBe(true)
    expect(
      isBlankValue(
        Object.fromEntries([
          ['partOne', null],
          ['partTwo', undefined]
        ])
      )
    ).toBe(true)
    expect(
      isBlankValue({
        block: {
          partOne: ' ',
          nestedBlock: { partOne: '', partTwo: null }
        }
      })
    ).toBe(true)
  })

  it('treats a composite with any non-blank sub-field as filled', () => {
    expect(
      isBlankValue({
        partOne: '',
        partTwo: 'a stored value',
        partThree: '',
        partFour: ''
      })
    ).toBe(false)
  })

  it('treats primitives other than string as filled', () => {
    // 0 is filled (a stored count of 0 is an intentional value, not an
    // "I haven't answered yet"). Same for false, though we don't have
    // boolean widgets today.
    expect(isBlankValue(0)).toBe(false)
    expect(isBlankValue(false)).toBe(false)
  })
})
