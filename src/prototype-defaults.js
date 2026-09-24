import process from 'node:process'

/**
 * Prototype-only environment defaults, applied before config.js reads
 * `process.env`. Every way of starting this app - `npm start`, `npm run dev`,
 * the Docker `CMD` and the FIT web server - imports this first, so a fresh
 * clone with no environment variables still runs against stubs, in memory,
 * on the prototype's own port.
 *
 * Never overrides a variable that is already set.
 */
const PROTOTYPE_DEFAULTS = {
  STUB_MODE: 'true',
  SESSION_CACHE_ENGINE: 'memory',
  PORT: '3103'
}

for (const [key, value] of Object.entries(PROTOTYPE_DEFAULTS)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}
