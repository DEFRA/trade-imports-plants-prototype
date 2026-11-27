import { vi } from 'vitest'

import { recordPageRequestInBackground } from './page-request-metrics.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../../test-helpers/restore-config-after-each.js'

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

describe('page request metrics', () => {
  restoreConfigAfterEach([NAMESPACE_KEY])
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('emits one document with the page request dimension and both counts', async () => {
    recordPageRequestInBackground({ backendCalls: 3, sessionResolutions: 2 })

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    const directive = document._aws.CloudWatchMetrics[0]
    expect(directive.Namespace).toBe(TEST_NAMESPACE)
    expect(directive.Dimensions).toEqual([['request.kind']])
    expect(directive.Metrics).toEqual([
      expect.objectContaining({
        Name: 'page.request.backend.calls',
        Unit: 'Count'
      }),
      expect.objectContaining({
        Name: 'page.request.session.resolutions',
        Unit: 'Count'
      })
    ])
    expect(document['request.kind']).toBe('page')
    expect(document['page.request.backend.calls']).toBe(3)
    expect(document['page.request.session.resolutions']).toBe(2)
  })
})
