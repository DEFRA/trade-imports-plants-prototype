import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { withSetContext } from '../../app/shared/set-context.js'
import { createFakeStore } from './fake-store.js'
import { clearFakesFor, describeFakes } from './registry.js'

const RELEASE = 'plants-fake-store-test'
const OTHER_RELEASE = 'plants-fake-store-other'
const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const TEST_ONLY = 'Test only.'
const STARTER = 'starter-one'
const RESET_FAKE = 'reset-test'
const RESET_SERVICE = 'A reset test service.'
const starters = [{ id: STARTER, name: 'Starter one' }]

const scratch = () => mkdtempSync(path.join(tmpdir(), 'designer-fake-'))

const inRelease = (fn) => withSetContext(RELEASE, fn)

/** The ids one organisation can see in one set. */
const idsIn = (setId, store, organisationId = ORG) =>
  withSetContext(setId, () => store.visible(organisationId).map(({ id }) => id))

describe('#createFakeStore', () => {
  it('Should show starters to everyone and added rows only to their organisation', () => {
    const store = createFakeStore({
      name: 'scoping-test',
      needsARealService: TEST_ONLY,
      starters,
      persist: false
    })

    inRelease(() => store.add(ORG, { id: 'mine', name: 'Mine' }))

    expect(idsIn(RELEASE, store)).toEqual([STARTER, 'mine'])
    expect(idsIn(RELEASE, store, OTHER_ORG)).toEqual([STARTER])
  })

  it('Should keep one pile per set, so one set never sees another set’s rows', () => {
    const store = createFakeStore({
      name: 'per-set-test',
      needsARealService: TEST_ONLY,
      persist: false
    })

    inRelease(() => store.add(ORG, { id: 'in-release', name: 'Here' }))

    expect(idsIn(OTHER_RELEASE, store)).toEqual([])
    expect(idsIn(RELEASE, store)).toEqual(['in-release'])
  })

  it('Should remove an added row, hide a starter from one organisation, and refuse a row it cannot see', () => {
    const store = createFakeStore({
      name: 'remove-test',
      needsARealService: TEST_ONLY,
      starters,
      persist: false
    })
    inRelease(() => store.add(ORG, { id: 'mine', name: 'Mine' }))

    expect(inRelease(() => store.remove(ORG, 'mine'))).toBe(true)
    expect(inRelease(() => store.remove(ORG, STARTER))).toBe(true)
    expect(inRelease(() => store.remove(ORG, 'never-existed'))).toBe(false)
    expect(idsIn(RELEASE, store)).toEqual([])
    expect(idsIn(RELEASE, store, OTHER_ORG)).toEqual([STARTER])
  })

  it('Should bring added rows back after a restart, and forget them on Reset', () => {
    const dir = scratch()
    const options = {
      name: 'restart-test',
      needsARealService: TEST_ONLY,
      persist: true,
      dir
    }
    const beforeRestart = createFakeStore(options)
    inRelease(() => beforeRestart.add(ORG, { id: 'kept', name: 'Kept' }))
    const file = path.join(dir, `${RELEASE}.restart-test.json`)

    const afterRestart = createFakeStore(options)

    expect(existsSync(file)).toBe(true)
    expect(idsIn(RELEASE, afterRestart)).toEqual(['kept'])

    clearFakesFor(RELEASE)

    expect(existsSync(file)).toBe(false)
    expect(idsIn(RELEASE, afterRestart)).toEqual([])
  })

  it('Should be emptied by Reset of its own set only, and named for the hand-off', () => {
    const store = createFakeStore({
      name: RESET_FAKE,
      needsARealService: RESET_SERVICE,
      persist: false
    })
    inRelease(() => store.add(ORG, { id: 'a', name: 'A' }))
    withSetContext(OTHER_RELEASE, () => store.add(ORG, { id: 'b', name: 'B' }))

    expect(clearFakesFor(RELEASE)).toContain(RESET_FAKE)

    expect(idsIn(RELEASE, store)).toEqual([])
    expect(idsIn(OTHER_RELEASE, store)).toEqual(['b'])
    expect(describeFakes()).toContainEqual({
      name: RESET_FAKE,
      needsARealService: RESET_SERVICE
    })
  })
})
