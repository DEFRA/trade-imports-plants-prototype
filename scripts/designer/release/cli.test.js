import { describe, expect, it } from 'vitest'
import { parseArgs } from './cli.js'
import { formatOrders, readOrders } from './orders.js'
import { REPO_ROOT } from './sets.js'

describe('parseArgs', () => {
  it('Should read a command and the release it acts on', () => {
    expect(parseArgs(['retire', 'plants-old'])).toEqual({
      command: 'retire',
      target: 'plants-old',
      rest: [],
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
      rest: [],
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
      rest: [],
      flags: { as: 'plants-dr2-1', describe: 'Design release 2, carried on' }
    })
  })

  it('Should read the pages after the release for orders', () => {
    expect(
      parseArgs(['orders', 'plants-working', 'consignors/select', 'origin'])
    ).toMatchObject({
      target: 'plants-working',
      rest: ['consignors/select', 'origin']
    })
  })

  it('Should read no command when none was given', () => {
    expect(parseArgs([]).command).toBeUndefined()
  })
})

describe('orders on the real journey', () => {
  it('Should read the first pass, the sections and the task list', async () => {
    const orders = await readOrders('high-risk-plants', {
      repoRoot: REPO_ROOT
    })

    expect(orders.firstPass[0]).toBe('commodity-type')
    expect(orders.firstPass).toContain('consignors/select')
    expect(orders.sections.length).toBeGreaterThan(0)
    expect(orders.groups.map((group) => group.id)).toContain(
      'consignment-parties'
    )

    const text = formatOrders('high-risk-plants', orders, ['consignors/select'])
    expect(text).toContain('*consignors/select*')
    expect(text).toMatch(/consignors\/select is number \d+/)
  })
})
