import { beforeEach, describe, expect, it } from 'vitest'

import {
  configureSession,
  knownJourneysCookie
} from '../../app/engine/persistence/session.js'
import { authenticatedCredentials } from '../../app/engine/test-support.js'
import { records as stubRecords } from '../../app/services/persistence/records/stub/index.js'
import { session as stubSession } from '../../app/services/persistence/session/stub.js'
import { withSetContext } from '../../app/shared/set-context.js'
import { filtersFromQuery } from './query.js'
import { countKnown, listKnownWithFilters } from './dashboard.js'
import { designerRecords } from './index.js'
import { SET_ID } from '../../../../test/fixtures/index.js'

/** The unit suite's fixture set stands in for a release: dashboard rows are
 * read through the set's obligations, and the fixture is the set every unit
 * test has configured. */
const RELEASE = SET_ID

const inRelease = (fn) => withSetContext(RELEASE, fn)

const requestKnowing = (journeyIds, credentials = authenticatedCredentials) =>
  inRelease(() => ({
    query: {},
    state: { [knownJourneysCookie()]: journeyIds },
    auth: { isAuthenticated: true, credentials }
  }))

describe('#listKnownWithFilters and #countKnown', () => {
  let wrapped
  let ids

  beforeEach(async () => {
    configureSession(RELEASE, stubSession)
    wrapped = designerRecords(RELEASE, stubRecords, { persist: false })
    ids = await inRelease(async () => {
      await wrapped.clear()
      const draft = await wrapped.create()
      const submitted = await wrapped.create()
      await wrapped.finalise(submitted.journeyId)
      const deleted = await wrapped.create()
      await wrapped.softDelete(deleted.journeyId)
      // Made in the release but never opened in this browser.
      const stranger = await wrapped.create()
      return {
        draft: draft.journeyId,
        submitted: submitted.journeyId,
        deleted: deleted.journeyId,
        stranger: stranger.journeyId
      }
    })
  })

  it('Should list only what the browser knows, filtered by a status from the query string', async () => {
    const request = requestKnowing([ids.draft, ids.submitted, ids.deleted])
    const { filters } = filtersFromQuery({ status: 'submitted' })

    const listed = await inRelease(() =>
      listKnownWithFilters(request, { page: 1, ...filters })
    )

    expect(listed.rows.map((row) => row.journeyId)).toEqual([ids.submitted])
    expect(listed.totalElements).toBe(1)
  })

  it('Should count each status for the tabs, leaving out deleted and unknown notifications', async () => {
    const request = requestKnowing([ids.draft, ids.submitted, ids.deleted])

    const counts = await inRelease(() =>
      countKnown(request, { status: 'draft' })
    )

    expect(counts).toEqual({
      total: 2,
      byStatus: { draft: 1, submitted: 1, amend: 0 },
      late: 0,
      byTab: { all: 2, drafts: 1, submitted: 1, amended: 0 }
    })
  })

  it('Should answer empty for a signed-in user with no organisation, as the engine does', async () => {
    const request = requestKnowing([ids.draft], {})

    const listed = await inRelease(() => listKnownWithFilters(request))
    const counts = await inRelease(() => countKnown(request))

    expect(listed).toEqual({
      rows: [],
      page: 1,
      size: 0,
      totalElements: 0,
      totalPages: 0
    })
    expect(counts.total).toBe(0)
  })
})
