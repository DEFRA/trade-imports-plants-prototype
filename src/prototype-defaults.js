import process from 'node:process'

/**
 * Prototype-only environment defaults, applied before config.js reads
 * `process.env`. Every way of starting this app - `npm start`, `npm run dev`,
 * the Docker `CMD` and the FIT web server - imports this first.
 *
 * - `STUB_MODE`: every run — `npm run dev`, `npm start`, and so the deployed
 *   prototype's own boot too — signs in with plants-frontend's stub sign-in
 *   and needs nothing else running, unless it is explicitly set to `false`,
 *   which restores plants-frontend's own Defra ID sign-in. The data services
 *   serve stub data in production regardless (see `isStubDataMode` in
 *   mode.js).
 * - `SESSION_CACHE_ENGINE`: the prototype runs as one instance with no Redis,
 *   and plants-frontend's production default is Redis.
 *
 * The port needs no default here: config.js already defaults it to 3103.
 *
 * Never overrides a variable that is already set.
 */
const PROTOTYPE_DEFAULTS = {
  STUB_MODE: 'true',
  SESSION_CACHE_ENGINE: 'memory'
}

for (const [key, value] of Object.entries(PROTOTYPE_DEFAULTS)) {
  if (process.env[key] === undefined) {
    process.env[key] = value
  }
}
