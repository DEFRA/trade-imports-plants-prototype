import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Stub sign-in follows STUB_MODE everywhere, including in production:
 * `prototype-defaults.js` turns it on unless it is already set, so the
 * deployed prototype signs in exactly the way `npm run dev` does — hands a
 * session to any caller with no identity provider involved. Setting
 * STUB_MODE=false restores plants-frontend's own Defra ID sign-in. */
export const isStubMode = () => config.get('stubMode')

/** Prototype only: whether the data services (records store, address book,
 * countries, ports) serve stub data. Every run serves stub data, production
 * included: the prototype has no backend, address book or reference data
 * behind it. Sign-in is controlled separately, by `isStubMode` above. */
export const isStubDataMode = () =>
  config.get('stubMode') || config.get('isProduction')
