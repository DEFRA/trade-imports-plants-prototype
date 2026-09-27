import { describe, expect, it } from 'vitest'
import { parseArgs } from './cli.js'

describe('parseArgs', () => {
  it('Should read a command and the release it acts on', () => {
    expect(parseArgs(['retire', 'plants-old'])).toEqual({
      command: 'retire',
      target: 'plants-old',
      flags: {}
    })
  })

  it('Should read flags with values and flags on their own', () => {
    expect(
      parseArgs([
        'carry',
        '--from',
        'plants-a',
        '--to',
        'plants-b',
        '--working'
      ])
    ).toEqual({
      command: 'carry',
      target: undefined,
      flags: { from: 'plants-a', to: 'plants-b', working: true }
    })
  })

  it('Should read a new id and a description for freeze', () => {
    expect(
      parseArgs([
        'freeze',
        'plants-dr2',
        '--as',
        'plants-dr2-1',
        '--describe',
        'Design release 2, carried on'
      ])
    ).toEqual({
      command: 'freeze',
      target: 'plants-dr2',
      flags: { as: 'plants-dr2-1', describe: 'Design release 2, carried on' }
    })
  })

  it('Should read no command when none was given', () => {
    expect(parseArgs([]).command).toBeUndefined()
  })
})
