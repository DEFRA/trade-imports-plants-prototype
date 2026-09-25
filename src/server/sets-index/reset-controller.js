import { mountedSetIds } from '../app/shared/set-context.js'
import { HTTP_STATUS_NOT_FOUND } from '../app/lib/http-status.js'
import { resetSet } from '../prototype-seed/index.js'

/**
 * "Reset this prototype's data": clears every record in one set and, where
 * the set has example data, seeds it again — see `prototype-seed/index.js`.
 * The data is shared, so this resets it for everyone. Lands back on the
 * chooser, which reads `reset` off the query string to show the confirmation
 * banner.
 *
 * Signed out, the chooser offers no reset (see `sets-index/controller.js`), so
 * a request that reaches here anyway is sent back to the chooser untouched.
 */
const post = async (request, h) => {
  const { setId } = request.params
  if (!mountedSetIds().includes(setId)) {
    return h.response().code(HTTP_STATUS_NOT_FOUND)
  }
  if (!request.auth.isAuthenticated) {
    return h.redirect('/')
  }
  await resetSet(request.server, setId)
  return h.redirect(`/?reset=${encodeURIComponent(setId)}`)
}

export const resetRoute = {
  method: 'POST',
  path: '/reset/{setId}',
  options: { auth: { strategy: 'session', mode: 'try' } },
  handler: post
}
