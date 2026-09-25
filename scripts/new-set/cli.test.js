import { describe, expect, it } from 'vitest'
import { parseArgs } from './cli.js'

describe('parseArgs', () => {
  it('Should read the set id and default the template to sample-journey', () => {
    expect(parseArgs(['citrus-fruit'])).toEqual({
      setId: 'citrus-fruit',
      from: 'sample-journey'
    })
  })

  it('Should read an explicit --from template', () => {
    expect(parseArgs(['citrus-fruit', '--from', 'high-risk-plants'])).toEqual({
      setId: 'citrus-fruit',
      from: 'high-risk-plants'
    })
  })

  it('Should answer no set id when none was given', () => {
    expect(parseArgs([]).setId).toBeUndefined()
  })
})
