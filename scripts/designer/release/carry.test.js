import { writeFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scaffoldSet } from '../../new-set/index.js'
import { readReleaseRecord } from '../../new-set/release-record.js'
import { carryChange, uuidTranslation } from './carry.js'
import {
  commitAll,
  editIn,
  makeTestRepo,
  readIn,
  removeTestRepo
} from './test-repo.js'

const NOW = new Date('2026-09-27T10:00:00.000Z')
const ORIGIN_COPY = (setId) =>
  `src/server/app/sets/${setId}/journeys/linear/features/origin/copy/copy.en.js`
const ORIGIN_OBLIGATION = (setId) =>
  `src/server/app/sets/${setId}/obligations/sections/origin.js`
const OLD_HINT = "hint: 'Start typing to search for a country.'"
const NEW_HINT = "hint: 'The country the plants were grown in.'"

let repoRoot

const release = (setId, overrides = {}) =>
  scaffoldSet(
    { setId, from: 'high-risk-plants', purpose: 'working', ...overrides },
    { repoRoot, now: NOW }
  )

beforeEach(() => {
  repoRoot = makeTestRepo()
  release('plants-a')
  release('plants-b')
  release('plants-dr1', { purpose: 'frozen' })
  commitAll(repoRoot, 'Three releases')
})

afterEach(() => {
  removeTestRepo(repoRoot)
})

describe('carry', () => {
  it('Should carry an unsaved one-hint change into another release cleanly', () => {
    editIn(repoRoot, ORIGIN_COPY('plants-a'), OLD_HINT, NEW_HINT)

    const result = carryChange({
      from: 'plants-a',
      to: 'plants-b',
      working: true,
      repoRoot
    })

    expect(result).toEqual(
      expect.objectContaining({ how: 'clean', conflicts: [], mode: 'working' })
    )
    expect(result.files).toEqual([ORIGIN_COPY('plants-b')])
    expect(readIn(repoRoot, ORIGIN_COPY('plants-b'))).toContain(NEW_HINT)
  })

  it('Should carry a saved change named by its commit', () => {
    editIn(repoRoot, ORIGIN_COPY('plants-a'), OLD_HINT, NEW_HINT)
    const commit = commitAll(repoRoot, 'New origin hint')

    const result = carryChange({
      from: 'plants-a',
      to: 'plants-b',
      commit,
      repoRoot
    })

    expect(result.how).toBe('clean')
    expect(readIn(repoRoot, ORIGIN_COPY('plants-b'))).toContain(NEW_HINT)
  })

  it('Should rewrite obligation ids so a change beside one applies cleanly', () => {
    editIn(
      repoRoot,
      ORIGIN_OBLIGATION('plants-a'),
      "status: 'mandatory'",
      "status: 'optional'"
    )

    const result = carryChange({
      from: 'plants-a',
      to: 'plants-b',
      working: true,
      repoRoot
    })

    expect(result.how).toBe('clean')
    const carried = readIn(repoRoot, ORIGIN_OBLIGATION('plants-b'))
    expect(carried).toContain("status: 'optional'")
    const bId = readReleaseRecord(`${repoRoot}/src/server/app/sets/plants-b`)
      .uuidMap['5e18b2b2-06d3-49af-a55c-b78013d284c0']
    expect(carried).toContain(bId)
  })

  it('Should rewrite the release’s id inside the change', () => {
    editIn(
      repoRoot,
      ORIGIN_COPY('plants-a'),
      OLD_HINT,
      `${OLD_HINT}, // see plants-a`
    )

    const result = carryChange({
      from: 'plants-a',
      to: 'plants-b',
      working: true,
      repoRoot
    })

    expect(result.how).toBe('clean')
    expect(readIn(repoRoot, ORIGIN_COPY('plants-b'))).toContain(
      '// see plants-b'
    )
  })

  it('Should carry a new file that is not saved yet', () => {
    writeFileSync(
      `${repoRoot}/src/server/app/sets/plants-a/design-gaps.md`,
      '# Design gaps in plants-a\n'
    )

    const result = carryChange({
      from: 'plants-a',
      to: 'plants-b',
      working: true,
      repoRoot
    })

    expect(result.how).toBe('clean')
    expect(
      readIn(repoRoot, 'src/server/app/sets/plants-b/design-gaps.md')
    ).toBe('# Design gaps in plants-b\n')
  })

  it('Should refuse to carry into a frozen release', () => {
    editIn(repoRoot, ORIGIN_COPY('plants-a'), OLD_HINT, NEW_HINT)

    expect(() =>
      carryChange({
        from: 'plants-a',
        to: 'plants-dr1',
        working: true,
        repoRoot
      })
    ).toThrow(/is frozen/)
    expect(readIn(repoRoot, ORIGIN_COPY('plants-dr1'))).toContain(OLD_HINT)
  })

  it('Should refuse to carry into the real journey and point at hand-off', () => {
    editIn(repoRoot, ORIGIN_COPY('plants-a'), OLD_HINT, NEW_HINT)

    expect(() =>
      carryChange({
        from: 'plants-a',
        to: 'high-risk-plants',
        working: true,
        repoRoot
      })
    ).toThrow(/hand this to the real team/)
  })

  it('Should say so when there is nothing to carry', () => {
    expect(() =>
      carryChange({ from: 'plants-a', to: 'plants-b', repoRoot })
    ).toThrow(/no changes that are not saved/)
  })
})

describe('uuidTranslation', () => {
  const ROOT_ID = '11111111-1111-4111-8111-111111111111'
  const A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const a = {
    setId: 'plants-a',
    record: { root: 'high-risk-plants', uuidMap: { [ROOT_ID]: A_ID } }
  }
  const b = {
    setId: 'plants-b',
    record: { root: 'high-risk-plants', uuidMap: { [ROOT_ID]: B_ID } }
  }

  it('Should translate through both releases’ maps', () => {
    expect(uuidTranslation(a, b)(A_ID)).toBe(B_ID)
  })

  it('Should translate from the real journey straight through the target’s map', () => {
    expect(
      uuidTranslation({ setId: 'high-risk-plants', record: null }, b)(ROOT_ID)
    ).toBe(B_ID)
  })

  it('Should leave an id neither map knows alone', () => {
    const unknown = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

    expect(uuidTranslation(a, b)(unknown)).toBe(unknown)
  })

  it('Should refuse releases made from different journeys', () => {
    expect(() =>
      uuidTranslation(a, {
        setId: 'citrus-fruit',
        record: { root: 'sample-journey', uuidMap: {} }
      })
    ).toThrow(/cannot be carried/)
  })
})
