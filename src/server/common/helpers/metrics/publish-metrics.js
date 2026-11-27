import { Metrics } from '@defra/cdp-metrics'

import { config } from '../../../../config/config.js'
import { createLogger } from '../logging/logger.js'

const logger = createLogger()

export const MILLISECONDS = 'Milliseconds'
export const COUNT = 'Count'

const publishMetrics = async (dimensions, metrics, properties) => {
  const metricsLogger = new Metrics(logger).getMetricsLogger({ ...dimensions })
  metricsLogger.setNamespace(config.get('metrics.namespace'))
  for (const { name, value, unit } of metrics) {
    metricsLogger.putMetric(name, value, unit)
  }
  for (const [name, value] of Object.entries(properties)) {
    metricsLogger.setProperty(name, value)
  }
  await metricsLogger.flush()
}

/**
 * Writes one EMF document holding the given metrics, all with the same
 * dimensions, without making the caller wait for the flush. A document that
 * cannot be written is logged at warn with its dimensions and metric names.
 *
 * @param {Record<string, string>} dimensions - the dimensions every metric is published with
 * @param {Array<{ name: string, value: number, unit: string }>} metrics - the metrics
 * @param {Record<string, string>} [properties] - fields written to the document that are not dimensions
 */
export const publishMetricsInBackground = (
  dimensions,
  metrics,
  properties = {}
) => {
  publishMetrics(dimensions, metrics, properties).catch((error) => {
    logger.warn(
      { err: error, dimensions, metrics: metrics.map(({ name }) => name) },
      'Could not publish metrics'
    )
  })
}
