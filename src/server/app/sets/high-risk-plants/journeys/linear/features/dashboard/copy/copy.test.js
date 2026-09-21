import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import {
  configureRecords,
  records
} from '../../../../../../../engine/persistence/records.js'
import {
  configureSession,
  SESSION_COOKIES
} from '../../../../../../../engine/persistence/session.js'
import { records as recordsStub } from '../../../../../../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../../../../../../services/persistence/session/stub.js'
import { authenticatedCredentials } from '../../../../../../../engine/test-support.js'
import { isCopyLeaf, leaves } from '../../../../../../../shared/copy-leaves.js'

import { routes } from '../controller.js'
import { copy } from './copy.en.js'

describe('#copy', () => {
  it('Should have a non-empty string (or string-returning function) at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      const text =
        typeof value === 'function'
          ? value('sample', 'sample', 'sample')
          : value
      expect(isCopyLeaf(text), `${path} must resolve to copy`).toBe(true)
    }
  })

  it('Should render both multi-row results labels', () => {
    expect(copy.pagination.results.oneOf(21, 21)).toBe(
      'Showing 21 of 21 Results'
    )
    expect(copy.pagination.results.many(1, 20, 21)).toBe(
      'Showing 1 to 20 of 21 Results'
    )
  })

  it('Should carry no guidance URL — a null or empty leaf is not copy', () => {
    expect(Object.keys(copy)).not.toContain('guidanceUrl')
    expect(copy.guidanceLink).toBe(
      'Check whether your goods are high-risk and when you must notify (GOV.UK)'
    )
  })

  it('Should interpolate the hidden action label', () => {
    expect(copy.actionHidden('26-ABC123')).toBe('notification 26-ABC123')
  })

  it("Should pin the spec's intro body verbatim", () => {
    expect(copy.body).toBe(
      'Use this service to tell the plant health authorities about high-risk plants for planting, potatoes, or wood and cut trees you are importing from EU member states, as required by the Plant Health National Notification Scheme. You will answer a short set of questions about the consignment, then submit your notification.'
    )
  })

  it('Should keep the empty state honest about the session-only listing', () => {
    expect(copy.emptyText).toBe(
      'You have not started any notifications in this session.'
    )
  })

  it('Should offer no consignee label — the plants set has no consignee', () => {
    expect(Object.keys(copy.table)).not.toContain('consignee')
  })
})

describe('GET /', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
  })
  beforeEach(() => records.clear())

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const listGet = routes.find(
      (route) => route.method === 'GET' && route.path === '/'
    ).handler
    const h = { view: (template, context) => ({ template, context }) }

    const { context } = await listGet(
      {
        payload: {},
        params: {},
        query: {},
        state: { [SESSION_COOKIES.knownJourneys]: [] },
        headers: {},
        auth: { isAuthenticated: true, credentials: authenticatedCredentials },
        app: {}
      },
      h
    )

    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(copy.title)
    expect(context.sharedCopy.journeyStrip.draft).toBe('Draft')
  })
})
