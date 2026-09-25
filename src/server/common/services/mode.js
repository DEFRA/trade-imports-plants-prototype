import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Never honoured in production: stub mode hands a session to any unauthenticated caller with no identity provider involved. */
export const isStubMode = () =>
  config.get('stubMode') && !config.get('isProduction')

/** Prototype only: whether the data services (records store, address book,
 * countries, ports) serve stub data. Sign-in keeps asking `isStubMode` above,
 * exactly as plants-frontend does, so a production run signs in through Defra
 * ID while its data stays stubbed: the prototype has no backend, address book
 * or reference data behind it. A non-production run follows STUB_MODE, which
 * `prototype-defaults.js` turns on unless it is already set. */
export const isStubDataMode = () =>
  config.get('stubMode') || config.get('isProduction')
