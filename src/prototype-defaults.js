import process from 'node:process'

/**
 * Prototype-only environment defaults, applied before config.js reads
 * `process.env`. Every way of starting this app - `npm start`, `npm run dev`,
 * the Docker `CMD` and the FIT web server - imports this first.
 *
 * - `STUB_MODE`: a local development run (`npm run dev`) signs in with
 *   plants-frontend's stub sign-in and needs nothing else running. Production
 *   ignores it for sign-in, as plants-frontend does; the data services serve
 *   stub data in production regardless (see `isStubDataMode` in mode.js).
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
