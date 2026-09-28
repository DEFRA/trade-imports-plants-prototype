import {
  currentSetBase,
  mountedSetIds,
  withSetContext
} from '../app/shared/set-context.js'
import { HTTP_STATUS_NOT_FOUND } from '../app/lib/http-status.js'
import { findExample } from './examples.js'

const PAGE_ADDRESS = /^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/
const TASK_LIST = new Set(['task-list', 'hub'])

const encodedPath = (address) =>
  address.split('/').map(encodeURIComponent).join('/')

/**
 * Where in the example's notification to send the reader: the page named by
 * `?page=` (`task-list` for the task list, or any page address such as
 * `notification-view`), or else the page the example stopped at.
 */
const pageOf = (setId, { journeyId, stopAt }, page) => {
  const journeyBase = `${withSetContext(setId, currentSetBase)}/notifications/${encodeURIComponent(journeyId)}`
  if (TASK_LIST.has(page)) {
    return journeyBase
  }
  const address = PAGE_ADDRESS.test(page ?? '') ? page : stopAt
  return address ? `${journeyBase}/${encodedPath(address)}` : journeyBase
}

/**
 * A stable link to one example: `/examples/{setId}/{example}`.
 *
 * An example's reference number changes every time the prototype restarts or
 * its data is reset, so a link straight to its page breaks. This link names
 * the example instead, finds its journey as it is now — seeding the set
 * first if nothing has since the server started — and sends the reader to
 * the page the example stopped at. `?page=<address>` opens another page of the
 * same notification instead (`?page=task-list`, `?page=notification-view`),
 * so a pull request can link straight to the page that changed.
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
    const page = request.query.page
    if (found.journeyId && (page || !found.href)) {
      return h.redirect(pageOf(setId, found, page))
    }
    return h.redirect(found.href)
  }
})
