import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { withSetContext } from '../app/shared/set-context.js'
import { activeSetId } from './active-set.js'
import { createFakeStore } from './fake-store.js'
import { clearFakesFor } from './registry.js'

const RELEASE = 'plants-fake-store-test'
const OTHER_RELEASE = 'plants-fake-store-other'
const ORG = 'org-1'
const OTHER_ORG = 'org-2'

const STARTER = 'starter-one'
const RESET_FAKE = 'reset-test'
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
      starters,
      persist: false
    })

    inRelease(() => store.add(ORG, { id: 'mine', name: 'Mine' }))

    expect(idsIn(RELEASE, store)).toEqual([STARTER, 'mine'])
    expect(idsIn(RELEASE, store, OTHER_ORG)).toEqual([STARTER])
  })

  it('Should keep one pile per set, so one set never sees another set’s rows', () => {
    const store = createFakeStore({ name: 'per-set-test', persist: false })

    inRelease(() => store.add(ORG, { id: 'in-release', name: 'Here' }))

    expect(idsIn(OTHER_RELEASE, store)).toEqual([])
    expect(idsIn(RELEASE, store)).toEqual(['in-release'])
  })

  it('Should read starters from a function, for the set that is active', () => {
    const store = createFakeStore({
      name: 'starter-function-test',
      starters: () => [{ id: `for-${activeSetId()}`, name: 'Any' }],
      persist: false
    })

    expect(idsIn(RELEASE, store)).toEqual([`for-${RELEASE}`])
  })

  it('Should remove an added row, hide a starter from one organisation, and refuse a row it cannot see', () => {
    const store = createFakeStore({
      name: 'remove-test',
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

  it('Should change a starter for one organisation only, in its place in the list', () => {
    const store = createFakeStore({
      name: 'update-test',
      starters: [...starters, { id: 'starter-two', name: 'Starter two' }],
      persist: false
    })

    const changed = inRelease(() =>
      store.update(ORG, STARTER, { name: 'Renamed' })
    )

    expect(changed).toMatchObject({ id: STARTER, name: 'Renamed' })
    expect(inRelease(() => store.visible(ORG).map(({ name }) => name))).toEqual(
      ['Renamed', 'Starter two']
    )
    expect(inRelease(() => store.find(OTHER_ORG, STARTER).name)).toBe(
      'Starter one'
    )
    expect(
      inRelease(() => store.update(ORG, 'never-existed', {}))
    ).toBeUndefined()
  })

  it('Should report every organisation’s changes in a set, for an overlay', () => {
    const store = createFakeStore({
      name: 'changes-test',
      starters,
      persist: false
    })
    const before = inRelease(() => store.changes().version)

    inRelease(() => store.add(OTHER_ORG, { id: 'theirs', name: 'Theirs' }))
    inRelease(() => store.remove(ORG, STARTER))

    const changes = inRelease(() => store.changes())
    expect(changes.added.map(({ id }) => id)).toEqual(['theirs'])
    expect([...changes.hiddenIds]).toEqual([STARTER])
    expect(changes.version).toBeGreaterThan(before)
    expect(store.changes(OTHER_RELEASE).added).toEqual([])
  })

  it('Should bring added rows back after a restart, and forget them on Reset', () => {
    const dir = scratch()
    const options = { name: 'restart-test', persist: true, dir }
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

  it('Should be emptied by Reset of its own set only', () => {
    const store = createFakeStore({ name: RESET_FAKE, persist: false })
    inRelease(() => store.add(ORG, { id: 'a', name: 'A' }))
    withSetContext(OTHER_RELEASE, () => store.add(ORG, { id: 'b', name: 'B' }))

    expect(clearFakesFor(RELEASE)).toContain(RESET_FAKE)

    expect(idsIn(RELEASE, store)).toEqual([])
    expect(idsIn(OTHER_RELEASE, store)).toEqual(['b'])
  })
})
