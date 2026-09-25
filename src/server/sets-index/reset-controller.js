import { mountedSetIds } from '../app/shared/set-context.js'
import { HTTP_STATUS_NOT_FOUND } from '../app/lib/http-status.js'
import { organisationIdOf } from '../common/helpers/organisation-id.js'
import { reseedSet } from '../prototype-seed/index.js'

/**
 * "Reset this organisation's data": clears the signed-in organisation's own
 * stub records in one set and, where the set has example data for that
 * organisation, re-seeds it — see `prototype-seed/index.js`. Every other
 * organisation's records in the same set are left alone. Lands back on the
 * chooser, which reads `reset` off the query string to show the confirmation
 * banner naming whoever is signed in.
 *
 * Signed out, there is no organisation to reset — the chooser never renders
 * this form without one (see `sets-index/controller.js`), so a request that
 * reaches here anyway is refused rather than guessed at.
 */
const post = async (request, h) => {
  const { setId } = request.params
  const organisationId = organisationIdOf(request)
  if (!mountedSetIds().includes(setId)) {
    return h.response().code(HTTP_STATUS_NOT_FOUND)
  }
  if (!organisationId) {
    return h.redirect('/')
  }
  await reseedSet(request.server, setId, organisationId)
  return h.redirect(`/?reset=${encodeURIComponent(setId)}`)
}

export const resetRoute = {
  method: 'POST',
  path: '/reset/{setId}',
  options: { auth: { strategy: 'session', mode: 'try' } },
  handler: post
}
