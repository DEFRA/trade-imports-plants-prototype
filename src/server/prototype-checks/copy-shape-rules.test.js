import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  checkSetCopy,
  compareCopy,
  copyFoldersOf,
  copyNameOf,
  WELSH_NEEDED
} from './copy-shape.js'

const EN = 'copy.en.js'
const CY = 'copy.cy.js'
const ORIGIN_COPY = 'journeys/linear/features/origin/copy'

const rulesOf = (result) => result.problems.map((found) => found.rule)

const copyModule = (body) => `export const copy = ${body}\n`
const ENGLISH_ORIGIN = copyModule("{ heading: 'Origin' }")
const WELSH_ORIGIN = copyModule("{ heading: 'Tarddiad' }")

describe('compareCopy', () => {
  it('Should pass matching English and Welsh', () => {
    const result = compareCopy(
      { heading: 'Arrival', hint: (count) => `${count} items` },
      { heading: 'Cyrraedd', hint: (count) => `${count} eitem` }
    )

    expect(result).toEqual({ problems: [], markers: [] })
  })

  it('Should name a key the Welsh file is missing, with the marker to use', () => {
    const result = compareCopy(
      { heading: 'Arrival', hint: 'Enter the date' },
      { heading: 'Cyrraedd' }
    )

    expect(result.problems).toEqual([
      expect.objectContaining({
        rule: 'missing-welsh',
        keyPath: 'hint',
        message: expect.stringContaining(`'${WELSH_NEEDED} Enter the date'`)
      })
    ])
  })

  it('Should name a key only the Welsh file has', () => {
    const result = compareCopy(
      { heading: 'Arrival' },
      { heading: 'Cyrraedd', old: 'Hen' }
    )

    expect(rulesOf(result)).toEqual(['extra-welsh'])
  })

  it('Should refuse empty text in either language', () => {
    const result = compareCopy({ heading: '' }, { heading: '  ' })

    expect(rulesOf(result)).toEqual(['empty', 'empty'])
  })

  it('Should refuse words in one language and a function in the other', () => {
    const result = compareCopy({ hint: () => 'Hint' }, { hint: 'Awgrym' })

    expect(rulesOf(result)).toEqual(['kind'])
  })

  it('Should refuse functions that take different inputs', () => {
    const result = compareCopy(
      { hint: (count) => `${count}` },
      { hint: (count, total) => `${count}/${total}` }
    )

    expect(rulesOf(result)).toEqual(['inputs'])
  })

  it('Should refuse Welsh that is a straight copy of the English', () => {
    const result = compareCopy({ heading: 'Arrival' }, { heading: 'Arrival' })

    expect(rulesOf(result)).toEqual(['same-as-english'])
  })

  it('Should let a link address be the same in both languages', () => {
    const result = compareCopy(
      {
        guidanceHref: 'https://www.gov.uk/guidance/plant-health',
        help: { contactUrl: 'Contact us' },
        start: '/plants-working/dashboard'
      },
      {
        guidanceHref: 'https://www.gov.uk/guidance/plant-health',
        help: { contactUrl: 'Contact us' },
        start: '/plants-working/dashboard'
      }
    )

    expect(result).toEqual({ problems: [], markers: [] })
  })

  it('Should still refuse a sentence that only starts with a link', () => {
    const result = compareCopy(
      { hint: 'https://www.gov.uk explains this' },
      { hint: 'https://www.gov.uk explains this' }
    )

    expect(rulesOf(result)).toEqual(['same-as-english'])
  })

  it('Should accept and list the Welsh needed marker', () => {
    const result = compareCopy(
      { heading: 'Arrival', hint: (count) => `${count} items` },
      {
        heading: `${WELSH_NEEDED} Arrival`,
        hint: (count) => `${WELSH_NEEDED} ${count} items`
      }
    )

    expect(result.problems).toEqual([])
    expect(result.markers.map((marker) => marker.keyPath)).toEqual([
      'heading',
      'hint'
    ])
  })

  it('Should refuse the marker in the English file', () => {
    const result = compareCopy(
      { heading: `${WELSH_NEEDED} Arrival` },
      { heading: `${WELSH_NEEDED} Arrival` }
    )

    expect(rulesOf(result)).toContain('marker-in-english')
  })
})

describe('copyNameOf', () => {
  it.each([
    [ORIGIN_COPY, 'origin'],
    [
      'journeys/linear/features/commodities/details/copy',
      'commodities/details'
    ],
    ['journeys/linear/flow/section-captions/copy', 'section-captions']
  ])('Should name %s as %s', (folder, name) => {
    expect(copyNameOf(folder)).toBe(name)
  })
})

describe('checkSetCopy on a release folder', () => {
  let folder

  const writeCopy = (file, body) => {
    const copyFolder = path.join(folder, ORIGIN_COPY)
    mkdirSync(copyFolder, { recursive: true })
    writeFileSync(path.join(copyFolder, file), body)
  }

  beforeEach(() => {
    folder = mkdtempSync(path.join(os.tmpdir(), 'copy-shape-'))
  })

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true })
  })

  it('Should pass a release whose copy matches', async () => {
    writeCopy(EN, ENGLISH_ORIGIN)
    writeCopy(CY, WELSH_ORIGIN)

    const result = await checkSetCopy(folder)

    expect(copyFoldersOf(folder)).toEqual([ORIGIN_COPY])
    expect(result).toEqual({ copyFolders: 1, problems: [], markers: [] })
  })

  it('Should fail a release with a missing Welsh key and say how to fix it', async () => {
    writeCopy(EN, copyModule("{ heading: 'Origin', hint: 'Where it grew' }"))
    writeCopy(CY, WELSH_ORIGIN)

    const result = await checkSetCopy(folder)

    expect(result.problems).toEqual([
      expect.objectContaining({
        copy: 'origin',
        rule: 'missing-welsh',
        keyPath: 'hint',
        message: `The Welsh file has no \`hint\`. Add it to copy.cy.js. If you do not have the Welsh yet, write '${WELSH_NEEDED} Where it grew'.`
      })
    ])
  })

  it('Should fail a release with no Welsh file', async () => {
    writeCopy(EN, ENGLISH_ORIGIN)

    const result = await checkSetCopy(folder)

    expect(rulesOf(result)).toEqual(['no-welsh-file'])
  })

  it('Should report a copy file that cannot be read', async () => {
    writeCopy(EN, copyModule("{ heading: 'Origin' "))
    writeCopy(CY, WELSH_ORIGIN)

    const result = await checkSetCopy(folder)

    expect(rulesOf(result)).toEqual(['unreadable'])
  })
})
