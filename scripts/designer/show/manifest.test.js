import { describe, expect, it } from 'vitest'

import {
  allCaptures,
  axeLine,
  axeReport,
  axeSentence,
  buildManifest,
  captureFileName,
  fileSafe,
  runFolderName,
  summariseAxe
} from './manifest.js'

const violation = (id, impact, nodes, help = `${id} help`) => ({
  id,
  impact,
  help,
  helpUrl: `https://dequeuniversity.com/rules/axe/4.11/${id}`,
  nodes: Array.from({ length: nodes }, (_, index) => ({
    target: [`#field-${index}`]
  }))
})

describe('file names', () => {
  it('Should make page names safe for files', () => {
    expect(fileSafe('commodities/details')).toBe('commodities-details')
    expect(fileSafe('odd name?')).toBe('odd_name_')
  })

  it('Should name a picture by page, version, state and width', () => {
    expect(
      captureFileName({
        key: 'consignment/contact/select',
        variant: 'before',
        state: 'errors',
        width: 'desktop'
      })
    ).toBe('consignment-contact-select--before--errors--desktop.png')
  })

  it('Should name a run folder from its local start time', () => {
    expect(runFolderName(new Date(2026, 8, 27, 9, 5, 3))).toBe(
      '2026-09-27T09-05-03'
    )
  })
})

describe('summariseAxe', () => {
  it('Should keep what a designer needs, worst first', () => {
    expect(
      summariseAxe([
        violation('region', 'moderate', 1),
        violation('label', 'critical', 2),
        violation('color-contrast', 'serious', 7)
      ])
    ).toEqual([
      {
        id: 'label',
        impact: 'critical',
        help: 'label help',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.11/label',
        places: 2,
        targets: ['#field-0', '#field-1']
      },
      {
        id: 'color-contrast',
        impact: 'serious',
        help: 'color-contrast help',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.11/color-contrast',
        places: 7,
        targets: ['#field-0', '#field-1', '#field-2', '#field-3', '#field-4']
      },
      {
        id: 'region',
        impact: 'moderate',
        help: 'region help',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.11/region',
        places: 1,
        targets: ['#field-0']
      }
    ])
  })
})

describe('axeSentence and axeLine', () => {
  it('Should say when the check did not run', () => {
    expect(axeSentence(null)).toBe(
      'The accessibility check did not run on this page.'
    )
  })

  it('Should say no problems were found, and that it cannot catch everything', () => {
    expect(axeSentence([])).toBe(
      'The automatic accessibility check found no problems. It cannot catch everything, so still check the page yourself.'
    )
  })

  it('Should count serious problems separately', () => {
    const summary = summariseAxe([
      violation('label', 'serious', 1),
      violation('region', 'moderate', 1)
    ])
    expect(axeSentence(summary)).toBe(
      'The automatic accessibility check found 2 problems, 1 of them serious. Fix these before research or sharing.'
    )
  })

  it('Should say when none are serious', () => {
    expect(axeSentence(summariseAxe([violation('region', 'minor', 1)]))).toBe(
      'The automatic accessibility check found 1 problem. None of them are serious.'
    )
  })

  it('Should write one line per problem', () => {
    expect(
      axeLine(
        summariseAxe([
          violation('label', 'serious', 1, 'Form elements must have labels')
        ])[0]
      )
    ).toBe('Serious: Form elements must have labels (1 place)')
  })
})

describe('buildManifest', () => {
  const run = {
    set: 'plants-working',
    createdAt: '2026-09-27T09:05:03.000Z',
    commit: 'abc1234def',
    branch: 'design/plants-working-hints',
    localUrl: 'http://localhost:3103/plants-working',
    options: { pages: 'arrival-details', errors: true },
    pages: [
      {
        key: 'arrival-details',
        title: 'Arrival details',
        path: '/plants-working/notifications/<reference>/arrival-details',
        captures: [
          {
            key: 'arrival-details',
            variant: 'now',
            state: 'page',
            width: 'desktop',
            file: 'arrival-details--now--page--desktop.png'
          },
          {
            key: 'arrival-details',
            variant: 'now',
            state: 'errors',
            width: 'desktop',
            file: 'arrival-details--now--errors--desktop.png'
          }
        ],
        axe: { 'now/page': [], 'now/errors': [] }
      }
    ]
  }

  it('Should fill in every field with safe defaults', () => {
    const manifest = buildManifest(run)
    expect(manifest).toEqual({
      version: 1,
      set: 'plants-working',
      compare: null,
      createdAt: '2026-09-27T09:05:03.000Z',
      commit: 'abc1234def',
      branch: 'design/plants-working-hints',
      localUrl: 'http://localhost:3103/plants-working',
      options: { pages: 'arrival-details', errors: true },
      pages: [{ ...run.pages[0], notes: [] }],
      unreached: [],
      neverReached: [],
      changedFiles: [],
      notes: [],
      video: null
    })
  })

  it('Should list every picture and every accessibility result', () => {
    const manifest = buildManifest(run)
    expect(allCaptures(manifest).map((capture) => capture.file)).toEqual([
      'arrival-details--now--page--desktop.png',
      'arrival-details--now--errors--desktop.png'
    ])
    expect(axeReport(manifest)).toEqual({
      'arrival-details': { 'now/page': [], 'now/errors': [] }
    })
  })
})
