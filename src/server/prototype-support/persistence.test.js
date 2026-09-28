import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

import { records as stubRecords } from '../app/services/persistence/records/stub/index.js'
import { journeys } from '../app/services/persistence/records/stub/store/state.js'
import { withSetContext } from '../app/shared/set-context.js'
import { readJson, writeJson } from './persist.js'
import { recordsPersistence } from './persistence.js'
import { designerRecords } from './records.js'

const RELEASE = 'plants-persistence-test'
const SEEDED = ['GBN-HRP-26-EXAMPL']
const EXAMPLES = [
  {
    slug: 'draft',
    journeyId: SEEDED[0],
    href: `/${RELEASE}/notifications/${SEEDED[0]}`
  }
]

const scratch = () => mkdtempSync(path.join(tmpdir(), 'designer-records-'))

const seedLink = ({ pending = false, seeded = true } = {}) => ({
  hasBeenSeeded: () => seeded,
  seededIds: () => SEEDED,
  seededExamples: () => EXAMPLES,
  recordSeeded: vi.fn(),
  seedingPending: () => pending
})

/** Everything a restart throws away: the stub store's in-memory records. */
const restart = () => withSetContext(RELEASE, () => journeys().clear())

const inRelease = (fn) => withSetContext(RELEASE, fn)

describe('#designerRecords saving to disk', () => {
  it('Should bring a release’s notifications back after a restart, with the same reference numbers and statuses', async () => {
    const options = { persist: true, dir: scratch(), seed: seedLink() }
    const wrapped = designerRecords(RELEASE, stubRecords, options)
    const { draft, submitted } = await inRelease(async () => {
      const created = await wrapped.create()
      const toSubmit = await wrapped.create()
      await wrapped.finalise(toSubmit.journeyId)
      return { draft: created, submitted: toSubmit }
    })

    restart()
    expect(
      await inRelease(() => stubRecords.load({ journeyId: draft.journeyId }))
    ).toBeUndefined()

    const afterRestart = designerRecords(RELEASE, stubRecords, options)

    expect(
      await inRelease(() => afterRestart.load({ journeyId: draft.journeyId }))
    ).toMatchObject({ journeyId: draft.journeyId, status: 'draft' })
    expect(
      await inRelease(() =>
        afterRestart.load({ journeyId: submitted.journeyId })
      )
    ).toMatchObject({ status: 'submitted' })
  })

  it('Should tell the example seeder its examples came back, so it does not make them twice and example links still work', async () => {
    const options = { persist: true, dir: scratch(), seed: seedLink() }
    const wrapped = designerRecords(RELEASE, stubRecords, options)
    await inRelease(() => wrapped.create())
    restart()

    designerRecords(RELEASE, stubRecords, options)

    expect(options.seed.recordSeeded).toHaveBeenCalledWith(
      RELEASE,
      SEEDED,
      EXAMPLES
    )
  })

  it('Should leave the seeder alone for a set that was never seeded', async () => {
    const options = {
      persist: true,
      dir: scratch(),
      seed: seedLink({ seeded: false })
    }
    const wrapped = designerRecords(RELEASE, stubRecords, options)
    await inRelease(() => wrapped.create())
    restart()

    designerRecords(RELEASE, stubRecords, options)

    expect(options.seed.recordSeeded).not.toHaveBeenCalled()
  })

  it('Should wait to save while the examples are still being made', async () => {
    const persistence = recordsPersistence(RELEASE, {
      persist: true,
      dir: scratch(),
      seed: seedLink({ pending: true })
    })

    expect(persistence.save()).toBe(false)
    expect(existsSync(persistence.file)).toBe(false)
  })

  it('Should forget the saved file on Reset, so the next start begins from nothing', async () => {
    const options = { persist: true, dir: scratch(), seed: seedLink() }
    const wrapped = designerRecords(RELEASE, stubRecords, options)
    await inRelease(() => wrapped.create())
    expect(existsSync(wrapped.persistence.file)).toBe(true)

    await inRelease(() => wrapped.clear())

    expect(existsSync(wrapped.persistence.file)).toBe(false)
  })

  it('Should write the set id, the example ids and the stub store’s own documents', async () => {
    const options = { persist: true, dir: scratch(), seed: seedLink() }
    const wrapped = designerRecords(RELEASE, stubRecords, options)
    const created = await inRelease(async () => {
      await wrapped.clear()
      return wrapped.create()
    })

    const saved = readJson(wrapped.persistence.file)

    expect(saved).toMatchObject({
      version: 1,
      setId: RELEASE,
      seeded: true,
      seededIds: SEEDED,
      seededExamples: EXAMPLES,
      journeys: [
        expect.objectContaining({ id: created.journeyId, status: 'draft' })
      ]
    })
  })

  it('Should ignore a saved file that belongs to another set or an older format', () => {
    const dir = scratch()
    const persistence = recordsPersistence(RELEASE, {
      persist: true,
      dir,
      seed: seedLink()
    })
    const journey = { id: 'GBN-HRP-26-OTHER1', status: 'draft' }

    writeJson(persistence.file, {
      version: 1,
      setId: 'plants-other-release',
      journeys: [journey]
    })
    expect(persistence.restore()).toBe(0)

    writeJson(persistence.file, { setId: RELEASE, journeys: [journey] })
    expect(persistence.restore()).toBe(0)
  })

  it('Should stay off unless asked, outside a designer’s own computer', () => {
    const persistence = recordsPersistence(RELEASE)

    expect(persistence.enabled).toBe(false)
    expect(persistence.save()).toBe(false)
  })
})
