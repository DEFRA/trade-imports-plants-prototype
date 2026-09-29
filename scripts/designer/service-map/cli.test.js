import { describe, expect, it } from 'vitest'

import { REPO_ROOT } from '../lib/repo.js'
import { main, parseServiceMapArgs } from './cli.js'

const io = () => {
  const said = []
  let written = ''
  const opened = []
  return {
    said,
    opened,
    written: () => written,
    options: {
      root: REPO_ROOT,
      say: (line) => said.push(line),
      write: (text) => {
        written += text
      },
      open: (file) => opened.push(file)
    }
  }
}

describe('parseServiceMapArgs', () => {
  it('Should read the set, --no-open and --json-only, and name anything it does not know', () => {
    expect(
      parseServiceMapArgs([
        '--set',
        'plants-working',
        '--no-open',
        '--json-only'
      ])
    ).toEqual({
      options: {
        set: 'plants-working',
        open: false,
        jsonOnly: true,
        help: false
      },
      problems: []
    })
    expect(parseServiceMapArgs(['--set']).problems).toEqual([
      '--set needs a set id, for example --set plants-working.'
    ])
    expect(parseServiceMapArgs(['--nope']).problems).toEqual([
      '"--nope" is not something designer:service-map knows.'
    ])
  })
})

describe('main', () => {
  it('Should print the map as data with --json-only, writing nothing and opening nothing', async () => {
    const run = io()

    const code = await main(
      ['--set', 'high-risk-plants', '--json-only'],
      run.options
    )

    expect(code).toBe(0)
    const graph = JSON.parse(run.written())
    expect(graph.set.id).toBe('high-risk-plants')
    expect(graph.decisions.map((decision) => decision.obligation)).toEqual([
      'commodityType'
    ])
    expect(run.opened).toEqual([])
  })

  it('Should say plainly when there is no such set', async () => {
    const run = io()

    const code = await main(
      ['--set', 'no-such-set', '--json-only'],
      run.options
    )

    expect(code).toBe(1)
    expect(run.said[0]).toMatch(
      /^There is no set called "no-such-set"\. The sets are: /
    )
  })
})
