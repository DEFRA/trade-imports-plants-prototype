/**
 * Mounting a set, with the completeness check that turns a half-wired set into
 * a boot failure rather than an empty page.
 *
 * Every per-set seam has an unconfigured fallback, and only some of them
 * throw: `engine/persistence/session.js` hands back the shared default cookie
 * names, and `flow/journey-flow.js` answers with no sections, no task rows and
 * no layout. With a single set mounted a forgotten `configure*` call was
 * mostly self-announcing; with several sets in one process it renders an empty
 * dashboard to a real user, on the set that did nothing wrong, while every
 * other set carries on. So the host asks each set, as it mounts it, whether it
 * configured every seam it cannot answer a request without, and refuses to
 * start when it did not.
 *
 * Nothing here changes what an unconfigured seam does — those paths are
 * untouched, and simply stop being reachable through a mounted set.
 */
import {
  flowOnlyAnswersCookie,
  knownJourneysCookie,
  openingRunCookie
} from './engine/persistence/session.js'
import { seamConfiguredFor, withSetContext } from './shared/set-context.js'

/**
 * The seams a set cannot answer a request without: the label each one passes
 * to `setKeyed`, and the call a gateway configures it with.
 *
 * Deliberately absent: `Ready-for-check-your-answers`, which is fail-closed by
 * default, so a set that skips it holds its own submit gate shut rather than
 * opening it silently; `Answers-for-read sanitiser`, whose default is
 * identity; and `flow-only keys`, which `configureJourneyFlow` forwards, so no
 * gateway configures it directly. A set may leave all three alone.
 */
const REQUIRED_SEAMS = [
  { label: 'Obligation set', configure: 'configureObligationSet' },
  { label: 'Fulfilment registry', configure: 'configureFulfilmentRegistry' },
  { label: 'journey flow', configure: 'configureJourneyFlow' },
  { label: 'dispatch', configure: 'buildDispatch' },
  { label: 'records', configure: 'configureRecords' },
  { label: 'session', configure: 'configureSession' }
]

const describeSeam = ({ label, configure }) => `${label} (${configure})`

/**
 * A seam the registry has never heard of means its `setKeyed` label was
 * renamed, or the module that creates it is no longer loaded at mount. Either
 * way the check below would pass a set it never actually tested, so say so
 * rather than report a set as complete.
 */
const assertSeamsAreRegistered = (setId) => {
  const unknown = REQUIRED_SEAMS.filter(
    ({ label }) => seamConfiguredFor(label, setId) === undefined
  )
  if (unknown.length > 0) {
    const labels = unknown.map(({ label }) => `"${label}"`).join(', ')
    throw new Error(
      `Set "${setId}" cannot be checked: no seam answers to ${labels}. ` +
        'A setKeyed label has changed — set-mount.js names them.'
    )
  }
}

const assertSeamsAreConfigured = (setId) => {
  const missing = REQUIRED_SEAMS.filter(
    ({ label }) => !seamConfiguredFor(label, setId)
  )
  if (missing.length > 0) {
    throw new Error(
      `Set "${setId}" mounted without configuring ${missing.map(describeSeam).join(', ')}. ` +
        'An unconfigured seam answers with a default, which renders an empty page instead of failing.'
    )
  }
}

const journeyCookieNames = (setId) =>
  withSetContext(setId, () => [
    knownJourneysCookie(),
    openingRunCookie(),
    flowOnlyAnswersCookie()
  ])

/**
 * The one ordering this can observe after the fact: `registerJourneyCookie`
 * reads its names from the session seam, so running it before
 * `configureSession` registers the shared defaults instead of the set's own
 * names, and the set then reads cookies the server never registered. Comparing
 * the names the configured seam reports against the ones the server holds
 * catches that, and catches a gateway that never registered them at all.
 */
const assertJourneyCookiesAreRegistered = (server, setId) => {
  const registered = server.states?.cookies ?? {}
  const missing = journeyCookieNames(setId).filter(
    (name) => !Object.hasOwn(registered, name)
  )
  if (missing.length > 0) {
    throw new Error(
      `Set "${setId}" reads journey cookies the server never registered: ${missing.join(', ')}. ` +
        'registerJourneyCookie() must run after configureSession(), inside the set context.'
    )
  }
}

/**
 * Check a mounted set configured everything it needs. Exported for the tests
 * that pin each failure; production reaches it through `mountSet`.
 *
 * @param {import('@hapi/hapi').Server} server the server the set mounted on.
 * @param {string} setId the set to check.
 */
export const assertSetMounted = (server, setId) => {
  assertSeamsAreRegistered(setId)
  assertSeamsAreConfigured(setId)
  assertJourneyCookiesAreRegistered(server, setId)
}

/**
 * Register a set under its own prefix and check it is complete before the next
 * one mounts. Registering and checking are one call so a new set cannot be
 * added to the router with the check left off — the failure this guards
 * against is precisely a gateway that forgot a step.
 *
 * @param {import('@hapi/hapi').Server} server the server to mount on.
 * @param {object} plugin the set's gateway plugin.
 * @param {{setId: string, base: string}} mount the set's id and mount prefix.
 */
export const mountSet = async (server, plugin, { setId, base }) => {
  await server.register(plugin, { routes: { prefix: base } })
  assertSetMounted(server, setId)
}
