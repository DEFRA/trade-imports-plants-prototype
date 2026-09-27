import { describe, expect, it } from 'vitest'

import { main, resolveSet } from './cli.js'

const SETS = ['high-risk-plants', 'plants-working', 'sample-journey']

const collector = () => {
  let text = ''
  return {
    write: (chunk) => {
      text += chunk
    },
    text: () => text
  }
}

describe('resolveSet', () => {
  it('Should use the set named', () => {
    expect(resolveSet('plants-working', { sets: SETS })).toEqual({
      setId: 'plants-working'
    })
  })

  it('Should fall back to the working release changed most recently', () => {
    expect(
      resolveSet(undefined, { sets: SETS, fallback: 'plants-working' })
    ).toEqual({ setId: 'plants-working' })
  })

  it('Should ask for a set when there is no working release', () => {
    expect(resolveSet(undefined, { sets: SETS, fallback: null })).toEqual({
      error:
        'Say which set to check, for example --set high-risk-plants. The sets here are: high-risk-plants, plants-working, sample-journey.'
    })
  })

  it('Should name the sets when the one asked for does not exist', () => {
    expect(resolveSet('plants-wroking', { sets: SETS })).toEqual({
      error:
        'There is no set called "plants-wroking". The sets here are: high-risk-plants, plants-working, sample-journey.'
    })
  })
})

describe('main', () => {
  it('Should print the usage for --help', async () => {
    const stdout = collector()

    const code = await main(['--help'], { stdout, stderr: collector() })

    expect(code).toBe(0)
    expect(stdout.text()).toContain('Usage: npm run designer:check')
  })

  it('Should explain a wrong option and exit 2 without checking anything', async () => {
    const stderr = collector()

    const code = await main(['--fast'], { stdout: collector(), stderr })

    expect(code).toBe(2)
    expect(stderr.text()).toContain('I do not know "--fast".')
  })

  it('Should refuse a set that does not exist', async () => {
    const stderr = collector()

    const code = await main(['--set', 'no-such-set'], {
      stdout: collector(),
      stderr
    })

    expect(code).toBe(2)
    expect(stderr.text()).toContain('There is no set called "no-such-set".')
  })
})
