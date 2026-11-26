import { vi } from 'vitest'
import { Metrics } from '@defra/cdp-metrics'

import { publishMetricsInBackground } from './publish-metrics.js'
import { config } from '../../../../config/config.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'
import { restoreConfigAfterEach } from '../../test-helpers/restore-config-after-each.js'
import { recordModuleLoggerWarn } from '../../test-helpers/module-logger-lines.js'

const NAMESPACE_KEY = 'metrics.namespace'
const TEST_NAMESPACE = 'test-namespace'

describe('publish metrics', () => {
  restoreConfigAfterEach([NAMESPACE_KEY])
  const warnLines = recordModuleLoggerWarn()
  let logSpy

  beforeEach(() => {
    config.set(NAMESPACE_KEY, TEST_NAMESPACE)
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('publishes one document with the dimensions, the metrics and the properties given', async () => {
    publishMetricsInBackground(
      { Dependency: 'defra-id', Operation: 'jwks' },
      [{ name: 'ExternalCallFailure', value: 0, unit: 'Count' }],
      { Outcome: 'success' }
    )

    await vi.waitFor(() => expect(readEmfDocuments(logSpy)).toHaveLength(1))
    const [document] = readEmfDocuments(logSpy)
    expect(document._aws.CloudWatchMetrics[0]).toEqual({
      Namespace: TEST_NAMESPACE,
      Dimensions: [['Dependency', 'Operation']],
      Metrics: [{ Name: 'ExternalCallFailure', Unit: 'Count' }]
    })
    expect(document.Dependency).toBe('defra-id')
    expect(document.Operation).toBe('jwks')
    expect(document.ExternalCallFailure).toBe(0)
    expect(document.Outcome).toBe('success')
  })

  test('a document that cannot be written is logged at warn with the error, its dimensions and the metric names', async () => {
    const flushError = new Error('agent unavailable')
    const metricsLogger = {
      setNamespace: vi.fn(() => metricsLogger),
      putMetric: vi.fn(() => metricsLogger),
      setProperty: vi.fn(() => metricsLogger),
      flush: vi.fn().mockRejectedValue(flushError)
    }
    vi.spyOn(Metrics.prototype, 'getMetricsLogger').mockReturnValue(
      metricsLogger
    )

    publishMetricsInBackground({ 'request.kind': 'page' }, [
      { name: 'page.request.backend.calls', value: 1, unit: 'Count' },
      { name: 'page.request.session.resolutions', value: 1, unit: 'Count' }
    ])

    await vi.waitFor(() =>
      expect(warnLines.entriesWith('Could not publish metrics')).toHaveLength(1)
    )
    const [entry] = warnLines.entriesWith('Could not publish metrics')
    expect(entry.fields).toEqual({
      err: flushError,
      dimensions: { 'request.kind': 'page' },
      metrics: [
        'page.request.backend.calls',
        'page.request.session.resolutions'
      ]
    })
  })
})
