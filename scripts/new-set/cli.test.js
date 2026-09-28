import { describe, expect, it } from 'vitest'
import { parseArgs } from './cli.js'

describe('parseArgs', () => {
  it('Should read the set id and default to a working copy of sample-journey', () => {
    expect(parseArgs(['citrus-fruit'])).toEqual({
      setId: 'citrus-fruit',
      from: 'sample-journey',
      describe: undefined,
      purpose: 'working'
    })
  })

  it('Should read an explicit --from template', () => {
    expect(parseArgs(['citrus-fruit', '--from', 'high-risk-plants'])).toEqual(
      expect.objectContaining({
        setId: 'citrus-fruit',
        from: 'high-risk-plants'
      })
    )
  })

  it('Should read a description and a purpose in any order', () => {
    expect(
      parseArgs([
        'plants-research-oct',
        '--purpose',
        'research',
        '--describe',
        'October research round',
        '--from',
        'plants-dr2'
      ])
    ).toEqual({
      setId: 'plants-research-oct',
      from: 'plants-dr2',
      describe: 'October research round',
      purpose: 'research'
    })
  })

  it('Should answer no set id when none was given', () => {
    expect(parseArgs([]).setId).toBeUndefined()
  })
})
