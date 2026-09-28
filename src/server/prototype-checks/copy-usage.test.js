import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  checkCopyUsage,
  copyReferencesIn,
  templatesWithoutOwnCopy,
  unresolvedCopyReferences
} from './copy-usage.js'
import {
  REAL_JOURNEY_SET,
  setFolderOf,
  setIdsOnDisk,
  setsToCheck
} from './sets-on-disk.js'

const LIST_ENGLISH_FILE = 'features/list/copy/copy.en.js'
const TITLE_X_COPY = "export const copy = { title: 'X' }"
const WELCOME_TEMPLATE = 'features/welcome/template.njk'
const LIST_TEMPLATE = 'features/list/template.njk'
const COPY_TITLE_REFERENCE = '{{ copy.title }}'
const SHARED_ENGLISH_FILE = 'features/commodities/copy/copy.en.js'
const SHARED_LIST_TEMPLATE = 'features/commodities/list/list.njk'

let root

const write = (relativePath, content) => {
  const full = path.join(root, relativePath)
  mkdirSync(path.dirname(full), { recursive: true })
  writeFileSync(full, content)
}

const writeListCopy = () => write(LIST_ENGLISH_FILE, TITLE_X_COPY)

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), 'copy-usage-'))
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('copyReferencesIn', () => {
  it('Should read a dotted copy path, stopping at a bracket', () => {
    expect(copyReferencesIn('{{ copy.list.title }}')).toEqual(['list.title'])
    expect(copyReferencesIn('copy.add.types[type]\ncopy.errors')).toEqual([
      'add.types',
      'errors'
    ])
  })

  it('Should ignore a literal mention of copy.en.js or copy.cy.js', () => {
    expect(
      copyReferencesIn('// change copy.en.js and copy.cy.js together')
    ).toEqual([])
  })

  it('Should deduplicate and sort', () => {
    expect(copyReferencesIn('copy.b.x copy.a.y copy.b.x')).toEqual([
      'a.y',
      'b.x'
    ])
  })
})

describe('templatesWithoutOwnCopy', () => {
  it('Should name a template that reads copy.<path> with no copy.en.js above it', () => {
    write(WELCOME_TEMPLATE, '{{ copy.heading }}')
    write(LIST_TEMPLATE, COPY_TITLE_REFERENCE)
    writeListCopy()

    expect(templatesWithoutOwnCopy(root)).toEqual([WELCOME_TEMPLATE])
  })

  it('Should say nothing for a template that reads no copy at all', () => {
    write(WELCOME_TEMPLATE, '<h1>{{ heading }}</h1>')

    expect(templatesWithoutOwnCopy(root)).toEqual([])
  })

  it('Should say nothing when a copy folder one level up covers several pages', () => {
    write(SHARED_ENGLISH_FILE, TITLE_X_COPY)
    write(SHARED_LIST_TEMPLATE, COPY_TITLE_REFERENCE)
    write('features/commodities/details/details.njk', COPY_TITLE_REFERENCE)

    expect(templatesWithoutOwnCopy(root)).toEqual([])
  })
})

describe('unresolvedCopyReferences', () => {
  it('Should name a copy path a template reads that copy.en.js does not answer', async () => {
    write(
      LIST_TEMPLATE,
      '<h1>{{ copy.title }}</h1><p>{{ copy.missing.key }}</p>'
    )
    writeListCopy()

    const problems = await unresolvedCopyReferences(root)

    expect(problems).toEqual([{ template: LIST_TEMPLATE, path: 'missing.key' }])
  })

  it('Should accept a reference to a whole branch, not only a leaf', async () => {
    write(
      'features/add/template.njk',
      '{% if errors %}{{ copy.errors.name }}{% endif %}'
    )
    write(
      'features/add/copy/copy.en.js',
      "export const copy = { errors: { name: 'Enter a name' } }"
    )

    expect(await unresolvedCopyReferences(root)).toEqual([])
  })

  it('Should resolve a page in a shared copy folder against its own branch of that copy', async () => {
    write(
      SHARED_ENGLISH_FILE,
      "export const copy = { list: { heading: 'Commodities' } }"
    )
    write(SHARED_LIST_TEMPLATE, '{{ copy.heading }} {{ copy.missing }}')

    expect(await unresolvedCopyReferences(root)).toEqual([
      { template: SHARED_LIST_TEMPLATE, path: 'missing' }
    ])
  })

  it('Should say nothing for a template with no copy.en.js: templatesWithoutOwnCopy already reported it', async () => {
    write('features/orphan/template.njk', COPY_TITLE_REFERENCE)

    expect(await unresolvedCopyReferences(root)).toEqual([])
  })
})

describe('checkCopyUsage', () => {
  it('Should fold both checks into one problem list', async () => {
    write(WELCOME_TEMPLATE, '{{ copy.missing }}')

    const { problems } = await checkCopyUsage(root)

    expect(problems.map((problem) => problem.rule)).toEqual(['no-own-copy'])
  })

  it('Should say nothing for a clean release', async () => {
    write(LIST_TEMPLATE, COPY_TITLE_REFERENCE)
    writeListCopy()

    expect((await checkCopyUsage(root)).problems).toEqual([])
  })
})

describe('copy usage — every design release', () => {
  // high-risk-plants keeps its own, stricter upstream tests
  // (copy-parity.test.js) and reads copy through macro parameters that
  // shadow the page's own copy object, which this plain-text scan cannot
  // tell apart from the real thing — the same reason copy-shape.test.js
  // leaves it to those upstream tests.
  const releases = setsToCheck(setIdsOnDisk()).filter(
    (setId) => setId !== REAL_JOURNEY_SET
  )

  it.each(releases)('Should give %s no copy-usage problems', async (setId) => {
    const { problems } = await checkCopyUsage(setFolderOf(setId))

    expect(
      problems.map((problem) => problem.message),
      `copy-usage: ${setId} has problems`
    ).toEqual([])
  })
})
