export const backendBaseUrl =
  process.env.TRADE_IMPORTS_PLANTS_BACKEND_URL ?? 'http://localhost:8091'
export const tracingHeader = process.env.TRACING_HEADER ?? 'x-cdp-request-id'

export const notificationsUrl = `${backendBaseUrl}/notifications`

export const MAX_PROJECTION_ATTEMPTS = 2
