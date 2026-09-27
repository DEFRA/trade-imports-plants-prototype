import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerSet, unregisterSet } from './register-set.js'

const BEFORE = `import { sampleJourney } from '../app/routes-sample-journey.js'
import { SET_BASE as SAMPLE_JOURNEY_BASE } from '../app/sets/sample-journey/set.js'
import { setsIndex } from '../sets-index/index.js'
import { adoptKnownJourneys } from '../prototype-seed/adopt-known-journeys.js'

export const prototypeSets = {
  plugin: {
    name: 'prototype-sets',
    async register(server) {
      await server.register(sampleJourney, {
        routes: { prefix: SAMPLE_JOURNEY_BASE }
      })
      await server.register([setsIndex, adoptKnownJourneys])
    }
  }
}
`

/** The same file after `new:set plants-research-october` and
 * `npm run format`, which wraps the long import. */
const FORMATTED = BEFORE.replace(
  "import { setsIndex } from '../sets-index/index.js'",
  `import { plantsResearchOctober } from '../app/routes-plants-research-october.js'
import {
  SET_BASE as PLANTS_RESEARCH_OCTOBER_BASE
} from '../app/sets/plants-research-october/set.js'
import { setsIndex } from '../sets-index/index.js'`
).replace(
  '      await server.register([setsIndex, adoptKnownJourneys])',
  `      await server.register(plantsResearchOctober, {
        routes: { prefix: PLANTS_RESEARCH_OCTOBER_BASE }
      })
      await server.register([setsIndex, adoptKnownJourneys])`
)

let file

beforeEach(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'register-set-'))
  file = path.join(dir, 'index.js')
  writeFileSync(file, BEFORE)
})

afterEach(() => {
  rmSync(path.dirname(file), { recursive: true, force: true })
})

describe('unregisterSet', () => {
  it('Should take out exactly what registerSet put in', () => {
    registerSet(file, { setId: 'plants-dr2' })

    expect(unregisterSet(file, { setId: 'plants-dr2' })).toBe(true)
    expect(readFileSync(file, 'utf8')).toBe(BEFORE)
  })

  it('Should take out a mount that prettier has re-wrapped', () => {
    writeFileSync(file, FORMATTED)

    expect(unregisterSet(file, { setId: 'plants-research-october' })).toBe(true)
    expect(readFileSync(file, 'utf8')).toBe(BEFORE)
  })

  it('Should leave the file alone when the set is not mounted there', () => {
    expect(unregisterSet(file, { setId: 'plants-dr9' })).toBe(false)
    expect(readFileSync(file, 'utf8')).toBe(BEFORE)
  })
})
