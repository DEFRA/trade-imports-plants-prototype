import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { SHARED_FLAG, TEMPLATE_FLAG, findWords, pageWords } from './find.js'
import { makeFixtureTree } from './fixture-tree.js'
import { formatFind, formatPage } from './format.js'

const RELEASE_LINEAR = 'src/server/app/sets/plants-working/journeys/linear'
const REAL_HUB = 'src/server/app/sets/high-risk-plants/journeys/linear'
const NO_SUCH_SET = "There is no set called 'no-such-set'"

let tree

beforeAll(() => {
  tree = makeFixtureTree()
})

afterAll(() => {
  tree.remove()
})

const find = (text, setId) => findWords({ root: tree.root, text, setId })
const inRelease = (text) => find(text, 'plants-working')
const homeOf = (entry) => `${entry.feature}:${entry.keyPath}`
const placeOf = (entry) => `${entry.file}:${entry.line}`
const lineOf = (entry) => [entry.line, entry.text, entry.flags]
const featureOf = (entry) => entry.feature

describe('findWords — copy in a design release', () => {
  it('Should find the section caption, the pages it shows on and its Welsh', async () => {
    const result = await inRelease('Consignment parties')
    const caption = result.copy.find(
      (entry) => entry.feature === 'section-captions'
    )
    expect(caption).toMatchObject({
      setId: 'plants-working',
      keyPath: 'sections.consignmentParties',
      pages: ['consignor-select'],
      file: `${RELEASE_LINEAR}/flow/section-captions/copy/copy.en.js`,
      line: 3,
      en: 'Consignment parties',
      cy: '[Welsh needed] Consignment parties',
      welsh: 'marked',
      kind: 'string',
      flags: []
    })
  })

  it('Should find every home of the words in the release', async () => {
    const result = await inRelease('Consignment parties')
    expect(result.copy.map(homeOf).sort()).toEqual([
      'check-answers:sections.parties',
      'hub:groups.consignment-parties',
      'section-captions:sections.consignmentParties'
    ])
  })

  it('Should name the task list after its feature, as it declares no page', async () => {
    const result = await inRelease('Consignment parties')
    const hub = result.copy.find((entry) => entry.feature === 'hub')
    expect(hub.pages).toEqual(['hub'])
  })

  it('Should say the release is yours and not frozen', async () => {
    const result = await inRelease('Consignment parties')
    expect(result.sets).toEqual([
      {
        setId: 'plants-working',
        kind: 'release',
        owner: 'yours',
        frozen: false,
        purpose: 'working'
      }
    ])
  })

  it('Should say which other pages show a feature copy, and Welsh left as English', async () => {
    const result = await inRelease('Consignor or exporter')
    expect(result.copy.map((entry) => entry.keyPath)).toEqual([
      'title',
      'errors.consignor'
    ])
    expect(result.copy[0]).toMatchObject({
      feature: 'consignor-select',
      pages: ['consignor-select'],
      alsoOn: ['notification-view'],
      welsh: 'same-as-english'
    })
  })

  it('Should leave error messages off the pages that borrow the labels', async () => {
    const result = await inRelease('Consignor or exporter')
    const error = result.copy.find(
      (entry) => entry.keyPath === 'errors.consignor'
    )
    expect(error.alsoOn).toEqual([])
  })

  it('Should give each page the one name every designer tool takes', async () => {
    const result = await inRelease('Consignment parties')
    const namesOf = (feature) =>
      result.copy.find((entry) => entry.feature === feature).pageNames
    expect(namesOf('section-captions')).toEqual(['consignors/select'])
    expect(namesOf('hub')).toEqual(['task-list'])
  })

  it('Should find a comment that quotes the words across a line break', async () => {
    const result = await inRelease('Consignment parties')
    expect(result.comments).toEqual([
      {
        setId: 'plants-working',
        shared: false,
        file: `${RELEASE_LINEAR}/features/hub/copy/copy.en.js`,
        line: 7,
        text: "AWAITING THE COPY PASS: 'Consignment parties' is a new task list group."
      }
    ])
  })

  it('Should find the Welsh too', async () => {
    const result = await inRelease('Partïon y llwyth')
    expect(result.copy.map(featureOf).sort()).toEqual(['check-answers', 'hub'])
  })

  it('Should find a copy function by its template and warn about its values', async () => {
    const result = await inRelease('days before arrival')
    expect(result.copy[0]).toMatchObject({
      kind: 'function',
      keyPath: 'late.warning',
      welsh: 'translated'
    })
    expect(result.copy[0].flags[0]).toContain('fills in 1 value(s)')
  })

  it('Should leave the real journey and its tests out when a set is named', async () => {
    const result = await inRelease('Consignment parties')
    const real = result.copy.filter((entry) => entry.setId !== 'plants-working')
    expect(real).toEqual([])
    expect(result.pinned).toEqual([])
  })
})

describe('findWords — shared chrome and templates', () => {
  it('Should flag shared copy as a real-service change', async () => {
    const result = await inRelease('Save and continue')
    const shared = result.copy.filter((entry) => entry.shared)
    expect(shared).toHaveLength(1)
    expect(shared[0]).toMatchObject({
      setId: null,
      feature: 'shared chrome',
      keyPath: 'saveActions.saveAndContinue',
      pages: [],
      flags: [SHARED_FLAG]
    })
  })

  it('Should flag words in the shared layout as copy that is also shared', async () => {
    const result = await inRelease('Save and continue')
    expect(result.templates).toEqual([
      {
        setId: null,
        shared: true,
        file: 'src/server/app/shared/layout.njk',
        line: 1,
        text: 'Save and continue later',
        flags: [TEMPLATE_FLAG, SHARED_FLAG]
      }
    ])
  })

  it('Should prefix a leaf of another export with the export name', async () => {
    const result = await inRelease('characters or fewer')
    expect(result.copy[0].keyPath).toBe('validatorDefaults.maxLength')
  })

  it('Should flag words written straight into a release template', async () => {
    const result = await inRelease('consignor')
    expect(result.templates.map(lineOf)).toEqual([
      [3, 'Choose a consignor from your address book.', [TEMPLATE_FLAG]],
      [5, 'Use this consignor', [TEMPLATE_FLAG]]
    ])
  })
})

describe('findWords — the real journey', () => {
  it('Should list the tests and specs that pin the English and the Welsh', async () => {
    const result = await find('Consignment parties', 'high-risk-plants')
    expect(result.pinned.map(placeOf).sort()).toEqual([
      'fit/journey.fit.spec.js:1',
      `${REAL_HUB}/features/hub/copy/copy.test.js:2`,
      `${REAL_HUB}/features/hub/copy/copy.test.js:3`,
      'src/server/app/shared/section-caption.test.js:1'
    ])
  })

  it('Should say the real journey belongs to the real service', async () => {
    const result = await find('Consignment parties', 'high-risk-plants')
    expect(result.sets[0].owner).toBe('real-service')
  })

  it('Should search every set when none is named', async () => {
    const result = await find('Consignment parties')
    expect(result.sets.map((info) => info.setId)).toEqual([
      'high-risk-plants',
      'plants-working'
    ])
  })

  it('Should refuse a set that does not exist', async () => {
    await expect(find('Arrival', 'no-such-set')).rejects.toThrow(NO_SUCH_SET)
  })
})

describe('pageWords', () => {
  const onPage = (page) =>
    pageWords({ root: tree.root, page, setId: 'plants-working' })

  it('Should list every string a page shows, with its caption', async () => {
    const result = await onPage('consignor-select')
    expect(result.page).toBe('consignors/select')
    expect(result.copy.map(homeOf).sort()).toEqual([
      'consignor-select:errors.consignor',
      'consignor-select:title',
      'section-captions:sections.consignmentParties'
    ])
  })

  it('Should take the page address, the task list and check your answers by any name', async () => {
    expect((await onPage('consignors/select')).page).toBe('consignors/select')
    expect((await onPage('hub')).page).toBe('task-list')
    expect((await onPage('check-answers')).page).toBe('notification-view')
  })

  it('Should list the labels check your answers borrows, but not their errors', async () => {
    const result = await onPage('notification-view')
    expect(result.copy.map(homeOf)).toContain('consignor-select:title')
    expect(result.copy.map(homeOf)).not.toContain(
      'consignor-select:errors.consignor'
    )
    expect(formatPage(result)).toContain('Words it borrows from other pages')
  })

  it('Should name the pages when there is no such page', async () => {
    await expect(onPage('origin')).rejects.toThrow(
      "There is no page called 'origin' in plants-working"
    )
  })
})

describe('formatFind', () => {
  it('Should tell a designer where the words live in plain English', async () => {
    const text = formatFind(await find('Consignment parties'))
    expect(text).toContain('Found "Consignment parties" in 4 copy strings')
    expect(text).toContain(
      'high-risk-plants (the real journey: it belongs to the real service)'
    )
    expect(text).toContain('plants-working (yours)')
    expect(text).toContain('Welsh:   [Welsh needed] Consignment parties')
    expect(text).toContain('Shown on: consignors/select')
    expect(text).toContain('Shown on: task-list')
    expect(text).toContain('Tests and specs that pin these words')
  })

  it('Should print the Welsh marker once', async () => {
    const text = formatFind(await inRelease('Consignment parties'))
    expect(text).toContain(
      'Welsh:   [Welsh needed] Consignment parties (waiting for a translator)'
    )
    expect(text).not.toContain('[[Welsh needed]]')
  })

  it('Should list comments that quote the words', async () => {
    const text = formatFind(await inRelease('Consignment parties'))
    expect(text).toContain('Comments that quote these words')
  })

  it('Should say so when nothing matched', async () => {
    const text = formatFind(await inRelease('Nothing like this'))
    expect(text).toContain('Nothing matched')
  })
})
