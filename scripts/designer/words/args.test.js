import { describe, expect, it } from 'vitest'

import { parseWordsArgs } from './args.js'

describe('parseWordsArgs', () => {
  it('Should read the words to find', () => {
    expect(parseWordsArgs(['find', 'Consignment parties'])).toEqual({
      command: 'find',
      text: 'Consignment parties',
      setId: undefined,
      json: false
    })
  })

  it('Should read --set and --json in any order', () => {
    expect(
      parseWordsArgs(['find', '--json', 'Arrival', '--set', 'plants-working'])
    ).toEqual({
      command: 'find',
      text: 'Arrival',
      setId: 'plants-working',
      json: true
    })
  })

  it('Should read the set to report on', () => {
    expect(parseWordsArgs(['report', 'plants-working'])).toEqual({
      command: 'report',
      setId: 'plants-working',
      json: false
    })
  })

  it('Should explain when there is no command', () => {
    expect(parseWordsArgs([]).error).toContain('find or report')
  })

  it('Should explain when there are no words to find', () => {
    expect(parseWordsArgs(['find']).error).toContain('Say which words')
  })

  it('Should explain when --set has no set id', () => {
    expect(parseWordsArgs(['find', 'Arrival', '--set']).error).toContain(
      '--set needs a set id'
    )
  })

  it('Should explain when the report has no set', () => {
    expect(parseWordsArgs(['report']).error).toContain('Say which set')
  })
})
