import { describe, expect, it } from 'vitest'

import { parseWalkthroughArgs } from './options.js'

describe('parseWalkthroughArgs', () => {
  it('Should walk the working release and open the report when given nothing', () => {
    expect(parseWalkthroughArgs([])).toEqual({
      options: {
        sets: [],
        all: false,
        open: true,
        show: false,
        fast: false,
        ci: false,
        help: false
      },
      problems: []
    })
  })

  it('Should read sets given together, repeated and with =', () => {
    const { options, problems } = parseWalkthroughArgs([
      '--set',
      'plants-working,high-risk-plants',
      '--set=plants-research',
      '--set',
      'plants-working'
    ])

    expect(problems).toEqual([])
    expect(options.sets).toEqual([
      'plants-working',
      'high-risk-plants',
      'plants-research'
    ])
  })

  it('Should never open the report on CI', () => {
    const { options } = parseWalkthroughArgs([
      '--ci',
      '--set',
      'plants-working'
    ])

    expect(options).toMatchObject({
      ci: true,
      open: false,
      sets: ['plants-working']
    })
  })

  it('Should read --no-open, --show, --all and --help', () => {
    expect(
      parseWalkthroughArgs(['--no-open', '--show', '--all', '-h']).options
    ).toMatchObject({ open: false, show: true, all: true, help: true })
  })

  it('Should read --fast', () => {
    expect(parseWalkthroughArgs(['--fast']).options).toMatchObject({
      fast: true
    })
  })

  it.each([
    [['--set'], '--set needs a set id after it, like --set plants-working.'],
    [
      ['--set', '--all'],
      '--set needs a set id after it, like --set plants-working.'
    ],
    [['--video'], '"--video" is not an option designer:walkthrough knows.'],
    [['--all', '--set', 'x'], 'Use --set or --all, not both.']
  ])('Should explain %j', (argv, problem) => {
    expect(parseWalkthroughArgs(argv).problems).toContain(problem)
  })
})
