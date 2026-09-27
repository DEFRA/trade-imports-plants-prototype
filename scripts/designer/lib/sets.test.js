import { utimesSync } from 'node:fs'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { defaultSet, listSets, releaseInfo, setDir, setOfPath } from './sets.js'
import { makeFixtureRepo } from './test-support.js'

describe('sets', () => {
  let fixture
  beforeEach(() => {
    fixture = makeFixtureRepo()
  })
  afterEach(() => fixture.cleanup())

  it('Should list every folder with a set.js, sorted', () => {
    fixture.write('src/server/app/sets/not-a-set/readme.md', 'no set.js\n')
    expect(listSets({ root: fixture.root })).toEqual([
      'high-risk-plants',
      'plants-dr2',
      'plants-working',
      'sample-journey'
    ])
  })

  it('Should give the absolute folder of a set', () => {
    expect(setDir('plants-dr2', { root: fixture.root })).toBe(
      path.join(fixture.root, 'src/server/app/sets/plants-dr2')
    )
  })

  it('Should call high-risk-plants the real journey and sample-journey the placeholder', () => {
    expect(releaseInfo('high-risk-plants', { root: fixture.root }).kind).toBe(
      'real-journey'
    )
    expect(releaseInfo('sample-journey', { root: fixture.root }).kind).toBe(
      'placeholder'
    )
  })

  it("Should read a release's release.json", () => {
    expect(releaseInfo('plants-dr2', { root: fixture.root })).toMatchObject({
      kind: 'release',
      id: 'plants-dr2',
      from: 'high-risk-plants',
      purpose: 'frozen',
      frozen: true,
      declared: true
    })
  })

  it('Should read a release with no release.json as an undeclared working release', () => {
    fixture.write('src/server/app/sets/citrus/set.js', 'export {}\n')
    expect(releaseInfo('citrus', { root: fixture.root })).toEqual({
      kind: 'release',
      id: 'citrus',
      purpose: 'working',
      frozen: false,
      declared: false
    })
  })

  it('Should answer null for a set that does not exist', () => {
    expect(releaseInfo('nope', { root: fixture.root })).toBeNull()
  })

  it.each([
    [
      'src/server/app/sets/plants-working/journeys/linear/flow/flow.js',
      'plants-working'
    ],
    ['src/server/app/routes-plants-dr2.js', 'plants-dr2'],
    ['src/server/app/routes.js', null],
    ['src/server/app/engine/journey.js', null],
    ['README.md', null]
  ])('Should place %s in set %s', (filePath, setId) => {
    expect(setOfPath(filePath, { root: fixture.root })).toBe(setId)
  })
})

describe('defaultSet', () => {
  let fixture
  beforeEach(() => {
    fixture = makeFixtureRepo({ git: true })
  })
  afterEach(() => fixture.cleanup())

  it('Should never pick a frozen release, the real journey or the placeholder', () => {
    expect(defaultSet({ root: fixture.root })).toBe('plants-working')
  })

  it('Should pick the working release with the newest unsaved change', () => {
    fixture.write(
      'src/server/app/sets/plants-oct/set.js',
      "export const SET_ID = 'plants-oct'\n"
    )
    fixture.write(
      'src/server/app/sets/plants-oct/release.json',
      '{ "purpose": "working", "frozen": false }\n'
    )
    const future = Date.now() / 1000 + 3600
    utimesSync(
      path.join(fixture.root, 'src/server/app/sets/plants-oct/set.js'),
      future,
      future
    )
    expect(defaultSet({ root: fixture.root })).toBe('plants-oct')
  })

  it('Should answer null when there is no working release', () => {
    fixture.write(
      'src/server/app/sets/plants-working/release.json',
      '{ "purpose": "research", "frozen": false }\n'
    )
    expect(defaultSet({ root: fixture.root })).toBeNull()
  })
})
