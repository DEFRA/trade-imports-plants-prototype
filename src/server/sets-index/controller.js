import { organisationIdOf } from '../common/helpers/organisation-id.js'
import { serverWideBase } from '../app/shared/kit.js'
import { descriptionFor } from '../prototype-sets/descriptions.js'
import {
  organisationName,
  PROTOTYPE_ORGANISATIONS
} from '../prototype-sets/organisations.js'

/**
 * A set id in the same sentence case the chooser has always shown it in —
 * shared between a row's own name and the reset banner naming the set that
 * was just reset.
 */
const displayNameFor = (setId) =>
  setId
    .split('-')
    .join(' ')
    .replace(/^./, (first) => first.toUpperCase())

/**
 * Turns a mounted set's `[setId, prefix]` pair into the row the chooser
 * renders. A set publishes nothing for this page beyond the mount it already
 * registers, so a new prototype appears here purely by mounting — there is no
 * list to keep in step. The link is the prefix the set actually mounted under,
 * read back rather than rebuilt from the id. A set carries no description of
 * its own (see `prototype-sets/descriptions.js`) and still lists without one.
 *
 * Reset only ever acts on the signed-in organisation's own records (see
 * `prototype-seed/index.js`), so there is nothing to offer signed out — the
 * row carries no organisation to reset, and `reset-controller.js` refuses the
 * same request if it reaches it regardless.
 *
 * @param {string|null} signedInAsName - who reset would act as, already
 * resolved to a display name (or the bare id, or null signed out).
 */
const rowFor =
  (signedInAsName) =>
  ([setId, prefix]) => ({
    setId,
    href: prefix,
    text: displayNameFor(setId),
    description: descriptionFor(setId),
    resetAction: `/reset/${setId}`,
    resetLabel: signedInAsName ? `Reset ${signedInAsName}’s data` : null
  })

const resetBanner = (request, sets, signedInAsName) => {
  const resetSetId = request.query?.reset
  const wasReset = sets.some(({ setId }) => setId === resetSetId)
  return wasReset && signedInAsName
    ? { setId: resetSetId, setText: displayNameFor(resetSetId), signedInAsName }
    : null
}

const organisationOptions = (currentOrganisationId) =>
  PROTOTYPE_ORGANISATIONS.map(({ id, name }) => ({
    value: id,
    text: name,
    checked: id === currentOrganisationId
  }))

export const setsIndexController = (mountedSets) => ({
  // `try`, not `false`: the chooser stays reachable signed out, but a request
  // that carries a session still reads it, so the service navigation renders
  // signed in — Log out included.
  options: { auth: { strategy: 'session', mode: 'try' } },
  handler: (request, h) => {
    const currentOrganisationId = organisationIdOf(request)
    const signedInAsName = currentOrganisationId
      ? (organisationName(currentOrganisationId) ?? currentOrganisationId)
      : null
    const sets = mountedSets()
      .toSorted(([a], [b]) => a.localeCompare(b))
      .map(rowFor(signedInAsName))

    // The template lives at `src/server/app/sets-index/template.njk`, apart
    // from this controller, because `src/config/nunjucks/nunjucks.js` resolves
    // Vision's view root at `server/app`.
    return h.view('sets-index/template', {
      ...serverWideBase('Prototypes'),
      heading: 'Prototypes',
      body: 'This service hosts more than one prototype. Choose one to open it.',
      sets,
      resetBanner: resetBanner(request, sets, signedInAsName),
      signInAction: '/auth/stub-sign-in',
      organisations: organisationOptions(currentOrganisationId),
      signedInAs: signedInAsName
    })
  }
})
