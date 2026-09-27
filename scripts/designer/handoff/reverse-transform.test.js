import { describe, expect, it } from 'vitest'
import { transformContent } from '../../new-set/transform.js'
import {
  orientUuidMap,
  pairUuidsByPosition,
  reverseContent,
  reversePath,
  reversePathThroughChain,
  reverseThroughChain,
  uuidsIn
} from './reverse-transform.js'

const ORIGINAL_A = '9c1f5d3a-7b24-4e18-9a6d-0f3b8c2e5a71'
const ORIGINAL_B = '1b2c3d4e-5f60-4a1b-8c2d-3e4f5a6b7c8d'
const COPY_A = 'aaaaaaaa-1111-4222-8333-444444444444'
const COPY_B = 'bbbbbbbb-5555-4666-8777-888888888888'

const HOP = {
  releaseId: 'plants-working',
  fromId: 'high-risk-plants'
}

describe('reverseContent', () => {
  it('Should rewrite the release id back in all three shapes', () => {
    const source = [
      "export const TEMPLATES = 'plants-working/journeys/linear'",
      "knownJourneys: 'plantsWorkingKnownJourneys'",
      "heading: 'Plants working'"
    ].join('\n')

    expect(reverseContent(source, HOP)).toBe(
      [
        "export const TEMPLATES = 'high-risk-plants/journeys/linear'",
        "knownJourneys: 'highRiskPlantsKnownJourneys'",
        "heading: 'High risk plants'"
      ].join('\n')
    )
  })

  it('Should map release UUIDs back through a UUID map', () => {
    const source = `id: '${COPY_A}',\nother: '${COPY_B}'`

    const reversed = reverseContent(source, {
      ...HOP,
      uuidMap: { [COPY_A]: ORIGINAL_A, [COPY_B]: ORIGINAL_B }
    })

    expect(reversed).toBe(`id: '${ORIGINAL_A}',\nother: '${ORIGINAL_B}'`)
  })

  it('Should keep a UUID the map does not know, such as a new question', () => {
    const source = `id: '${COPY_A}'`

    expect(reverseContent(source, { ...HOP, uuidMap: {} })).toBe(source)
  })

  it('Should undo what new:set did, given the pairs new:set made', () => {
    const original = `import x from '../sets/high-risk-plants/set.js'\nid: '${ORIGINAL_A}'`
    const copied = transformContent(original, {
      fromId: 'high-risk-plants',
      newId: 'plants-working'
    })
    const uuidMap = pairUuidsByPosition(copied, original)

    expect(reverseContent(copied, { ...HOP, uuidMap })).toBe(original)
  })
})

describe('orientUuidMap', () => {
  it('Should keep a map already written release UUID to original', () => {
    const map = orientUuidMap({ [COPY_A]: ORIGINAL_A }, [`id: '${COPY_A}'`])

    expect(map).toEqual({ [COPY_A]: ORIGINAL_A })
  })

  it('Should invert a map written original to release UUID, as release.json records it', () => {
    const map = orientUuidMap({ [ORIGINAL_A]: COPY_A }, [`id: '${COPY_A}'`])

    expect(map).toEqual({ [COPY_A]: ORIGINAL_A })
  })

  it('Should accept a list of from and to pairs', () => {
    const map = orientUuidMap([{ from: ORIGINAL_B, to: COPY_B }], [COPY_B])

    expect(map).toEqual({ [COPY_B]: ORIGINAL_B })
  })

  it('Should give an empty map when there is none', () => {
    expect(orientUuidMap(undefined)).toEqual({})
  })
})

describe('pairUuidsByPosition', () => {
  it('Should pair UUIDs in the order they appear', () => {
    expect(
      pairUuidsByPosition(`${COPY_A} ${COPY_B}`, `${ORIGINAL_A} ${ORIGINAL_B}`)
    ).toEqual({ [COPY_A]: ORIGINAL_A, [COPY_B]: ORIGINAL_B })
  })

  it('Should refuse to guess when the counts differ', () => {
    expect(pairUuidsByPosition(`${COPY_A} ${COPY_B}`, ORIGINAL_A)).toBeNull()
  })

  it('Should find every UUID, repeats included', () => {
    expect(uuidsIn(`${COPY_A} and ${COPY_A}`)).toHaveLength(2)
  })
})

describe('reversePath', () => {
  it('Should put a release path back under the real journey', () => {
    expect(reversePath('src/server/app/sets/plants-working/set.js', HOP)).toBe(
      'src/server/app/sets/high-risk-plants/set.js'
    )
  })
})

describe('reversing through a chain of releases', () => {
  const chain = [
    { releaseId: 'plants-dr2-1', fromId: 'plants-dr2', uuidMap: {} },
    {
      releaseId: 'plants-dr2',
      fromId: 'high-risk-plants',
      uuidMap: { [COPY_A]: ORIGINAL_A }
    }
  ]

  it('Should reverse a release made from another release step by step', () => {
    expect(reverseThroughChain(`'plants-dr2-1' '${COPY_A}'`, chain)).toBe(
      `'high-risk-plants' '${ORIGINAL_A}'`
    )
  })

  it('Should reverse its path the same way', () => {
    expect(
      reversePathThroughChain('src/server/app/sets/plants-dr2-1/set.js', chain)
    ).toBe('src/server/app/sets/high-risk-plants/set.js')
  })
})
