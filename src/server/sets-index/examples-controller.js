import {
  currentSetBase,
  mountedSetIds,
  withSetContext
} from '../app/shared/set-context.js'
import { HTTP_STATUS_NOT_FOUND } from '../app/lib/http-status.js'
import { findExample } from './examples.js'

const stopPageOf = (setId, { journeyId, stopAt }) => {
  const journeyBase = `${withSetContext(setId, currentSetBase)}/notifications/${encodeURIComponent(journeyId)}`
  return stopAt ? `${journeyBase}/${encodeURIComponent(stopAt)}` : journeyBase
}

/**
 * A stable link to one example: `/examples/{setId}/{example}`.
 *
 * An example's reference number changes every time the prototype restarts or
 * its data is reset, so a link straight to its page breaks. This link names
 * the example instead, finds its journey as it is now — seeding the set
 * first if nothing has since the server started — and sends the reader to
 * the page the example stopped at.
 *
 * Server-wide, like the chooser: it sits outside every set's prefix.
 *
 * @param {{ find?: typeof findExample }} [options] - `find` is swappable so
 *   the route can be tested without the example data it reads.
 */
export const examplesRoute = ({ find = findExample } = {}) => ({
  method: 'GET',
  path: '/examples/{setId}/{example}',
  options: { auth: { strategy: 'session', mode: 'try' } },
  handler: async (request, h) => {
    const { setId, example } = request.params
    if (!mountedSetIds().includes(setId)) {
      return h.response().code(HTTP_STATUS_NOT_FOUND)
    }
    const found = await find(request.server, setId, example)
    if (!found?.href && !found?.journeyId) {
      return h.response().code(HTTP_STATUS_NOT_FOUND)
    }
    return h.redirect(found.href ?? stopPageOf(setId, found))
  }
})
