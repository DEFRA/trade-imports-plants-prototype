import { describe, expect, it } from 'vitest'
import { parseArgs, run, USAGE } from './cli.js'

describe('parseArgs', () => {
  it('Should read the command and the set id', () => {
    expect(parseArgs(['off', 'plants-research-x'])).toEqual({
      command: 'off',
      setId: 'plants-research-x',
      deployedUrl: null,
      localUrl: 'http://localhost:3103'
    })
  })

  it('Should read the deployed and local addresses for the sheet', () => {
    expect(
      parseArgs([
        'sheet',
        'plants-research-x',
        '--deployed-url',
        'https://prototype.example',
        '--local-url',
        'http://localhost:3200'
      ])
    ).toEqual({
      command: 'sheet',
      setId: 'plants-research-x',
      deployedUrl: 'https://prototype.example',
      localUrl: 'http://localhost:3200'
    })
  })
})

describe('run', () => {
  const capture = (argv) => {
    const lines = []
    const code = run(argv, {
      repoRoot: '/nowhere',
      print: (line) => lines.push(line)
    })
    return { code, lines }
  }

  it('Should print the usage for an unknown command', () => {
    expect(capture(['explode', 'plants-research-x'])).toEqual({
      code: 1,
      lines: [USAGE]
    })
  })

  it('Should print the usage when the set id is missing', () => {
    expect(capture(['sheet']).code).toBe(1)
  })

  it('Should refuse a set id that is not kebab-case', () => {
    const { code, lines } = capture(['on', 'Plants Research'])
    expect(code).toBe(1)
    expect(lines[0]).toContain('is not a design release id')
  })

  it('Should refuse research mode on high-risk-plants before touching git', () => {
    const { code, lines } = capture(['on', 'high-risk-plants'])
    expect(code).toBe(1)
    expect(lines[0]).toContain('real journey')
  })
})
