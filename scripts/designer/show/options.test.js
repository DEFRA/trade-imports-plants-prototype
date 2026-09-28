import { describe, expect, it } from 'vitest'

import { parsePages, parseReference, parseShowArgs } from './options.js'

describe('parseShowArgs', () => {
  it('Should default to the changed pages with every extra off', () => {
    expect(parseShowArgs(['--set', 'plants-working'])).toEqual({
      options: {
        set: 'plants-working',
        pages: { mode: 'changed', keys: [] },
        before: false,
        beforeCommit: null,
        errors: false,
        mobile: false,
        video: false,
        open: false,
        help: false,
        eachExample: false,
        examples: true,
        compare: null,
        references: [],
        urls: [],
        exampleLinks: []
      },
      problems: []
    })
  })

  it('Should read the addresses, example links and example options', () => {
    const { options, problems } = parseShowArgs([
      '--set',
      'plants-working',
      '--pages',
      'chooser,dashboard',
      '--url',
      '?status=submitted',
      '--url',
      'notifications/{notification}/transporter-select/add',
      '--examples',
      'submitted, amended',
      '--each-example',
      '--no-examples',
      '--before-commit',
      'HEAD~1'
    ])
    expect(problems).toEqual([])
    expect(options).toMatchObject({
      pages: { mode: 'list', keys: ['chooser', 'dashboard'] },
      urls: [
        '?status=submitted',
        'notifications/{notification}/transporter-select/add'
      ],
      exampleLinks: ['submitted', 'amended'],
      eachExample: true,
      examples: false,
      before: true,
      beforeCommit: 'HEAD~1'
    })
  })

  it('Should read every flag and value option together', () => {
    const { options, problems } = parseShowArgs([
      '--set',
      'plants-working',
      '--pages',
      'arrival-details,origin',
      '--before',
      '--errors',
      '--mobile',
      '--video',
      '--open',
      '--compare',
      'high-risk-plants',
      '--reference',
      'origin=designs/origin.png'
    ])
    expect(problems).toEqual([])
    expect(options).toEqual({
      set: 'plants-working',
      pages: { mode: 'list', keys: ['arrival-details', 'origin'] },
      before: true,
      beforeCommit: null,
      errors: true,
      mobile: true,
      video: true,
      open: true,
      help: false,
      eachExample: false,
      examples: true,
      compare: 'high-risk-plants',
      references: [{ page: 'origin', image: 'designs/origin.png' }],
      urls: [],
      exampleLinks: []
    })
  })

  it('Should accept --name=value forms', () => {
    const { options } = parseShowArgs([
      '--set=plants-working',
      '--pages=all',
      '--compare=high-risk-plants'
    ])
    expect(options.set).toBe('plants-working')
    expect(options.pages).toEqual({ mode: 'all', keys: [] })
    expect(options.compare).toBe('high-risk-plants')
  })

  it('Should take a bare first word as the set', () => {
    expect(parseShowArgs(['plants-working']).options.set).toBe('plants-working')
  })

  it('Should collect several --reference options', () => {
    const { options } = parseShowArgs([
      '--set',
      'a',
      '--reference',
      'origin=one.png',
      '--reference',
      'dashboard=two.png'
    ])
    expect(options.references).toEqual([
      { page: 'origin', image: 'one.png' },
      { page: 'dashboard', image: 'two.png' }
    ])
  })

  it('Should explain an unknown option, a missing value and a bad reference', () => {
    const { problems } = parseShowArgs([
      '--set',
      'a',
      '--colour',
      '--reference',
      'no-equals-sign',
      '--compare'
    ])
    expect(problems).toEqual([
      '"--colour" is not an option designer:show knows.',
      '--reference needs a page and an image, like --reference arrival-details=designs/arrival.png (got "no-equals-sign").',
      '--compare needs a value after it.'
    ])
  })

  it('Should refuse comparing a set with itself', () => {
    expect(parseShowArgs(['--set', 'a', '--compare', 'a']).problems).toEqual([
      '--compare needs a different set from --set.'
    ])
  })

  it('Should ask for page names after --pages when a stray word appears', () => {
    expect(parseShowArgs(['--set', 'a', 'origin']).problems).toEqual([
      '"origin" was not expected. Put page names after --pages.'
    ])
  })

  it('Should read --help', () => {
    expect(parseShowArgs(['--help']).options.help).toBe(true)
    expect(parseShowArgs(['-h']).options.help).toBe(true)
  })
})

describe('parsePages', () => {
  it('Should treat all as winning over a list', () => {
    expect(parsePages(['origin', 'all'])).toEqual({ mode: 'all', keys: [] })
  })

  it('Should drop duplicates and blanks from a list', () => {
    expect(parsePages(['origin, ,origin', 'dashboard'])).toEqual({
      mode: 'list',
      keys: ['origin', 'dashboard']
    })
  })

  it('Should fall back to changed when nothing is named', () => {
    expect(parsePages(['changed'])).toEqual({ mode: 'changed', keys: [] })
  })

  it('Should add named pages to the changed ones', () => {
    expect(parsePages(['changed,dashboard'])).toEqual({
      mode: 'changed',
      keys: ['dashboard']
    })
  })
})

describe('parseReference', () => {
  it('Should split at the first equals sign', () => {
    expect(parseReference('origin=frames/a=b.png')).toEqual({
      page: 'origin',
      image: 'frames/a=b.png'
    })
  })

  it('Should answer null without a page or an image', () => {
    expect(parseReference('=a.png')).toBeNull()
    expect(parseReference('origin=')).toBeNull()
  })
})
