import { config } from '../../../config/config.js'

/** One switch for "run against stubs rather than the real thing", covering both
 * the data the journey reads and the way a trader signs in. There is no
 * configuration that wants one without the other: a stub run is self-contained
 * and needs neither the dependent services nor Defra ID, and a real run wants
 * both.
 *
 * Honoured in production here, unlike plants-frontend: stub mode hands a session to any unauthenticated caller, and this prototype has no real data or real service behind a session for that to compromise. */
export const isStubMode = () => config.get('stubMode')
