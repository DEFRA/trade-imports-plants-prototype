import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { runWords } from './cli.js'
import { makeFixtureTree } from './fixture-tree.js'

let tree

beforeAll(() => {
  tree = makeFixtureTree()
})

afterAll(() => {
  tree.remove()
})

describe('runWords', () => {
  it('Should print the usage and fail when the command is wrong', async () => {
    const { output, code } = await runWords(['look'], tree.root)
    expect(code).toBe(1)
    expect(output).toContain('npm run designer:words -- find')
  })

  it('Should print the find result as JSON with --json', async () => {
    const { output, code } = await runWords(
      ['find', 'Consignment parties', '--set', 'plants-working', '--json'],
      tree.root
    )
    expect(code).toBe(0)
    const result = JSON.parse(output)
    expect(result.text).toBe('Consignment parties')
    expect(result.copy).toHaveLength(3)
  })

  it('Should print the find result as plain English by default', async () => {
    const { output } = await runWords(
      ['find', 'Consignment parties', '--set', 'plants-working'],
      tree.root
    )
    expect(output).toContain('plants-working (yours)')
  })

  it('Should say where it wrote the report', async () => {
    const { output, code } = await runWords(
      ['report', 'plants-working'],
      tree.root
    )
    expect(code).toBe(0)
    expect(output).toContain('.cache/designer/words/plants-working/index.html')
    expect(output).toContain('1 marked [Welsh needed]')
  })

  it('Should explain a set that does not exist, not crash', async () => {
    const { output, code } = await runWords(
      ['find', 'Arrival', '--set', 'no-such-set'],
      tree.root
    )
    expect(code).toBe(1)
    expect(output).toContain("There is no set called 'no-such-set'")
  })
})
