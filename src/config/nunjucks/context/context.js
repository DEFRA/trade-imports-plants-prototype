import path from 'node:path'
import { readFileSync } from 'node:fs'

import { config } from '../../config.js'
import { createLogger } from '../../../server/common/helpers/logging/logger.js'
import {
  dashboardPath,
  inDashboardSection
} from '../../../server/app/shared/paths.js'
import {
  hasSetContext,
  setIdForPath,
  withSetContext
} from '../../../server/app/shared/set-context.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/assets-manifest.json'
)

let webpackManifest

/**
 * Which service-navigation item the current request sits under, so the layout
 * can mark it active. Section-wide, not page-wide: every notification page is
 * inside the dashboard's section of the service, which is why the answer for
 * `/notifications/123/origin` is still `dashboard`.
 *
 * @param {string} [requestPath] - the request path.
 * @returns {string|null} the id of the active navigation item, or null when the
 * request is under none of them.
 */
export function activeNavigationItem(requestPath = '') {
  // A server-wide page — the chooser at `/`, `/signout`, the sign-in error
  // page — belongs to no set, so no set's navigation item is active on it.
  // Asking `inDashboardSection` there would throw for want of a set.
  if (!hasSetContext()) {
    return null
  }
  return inDashboardSection(requestPath) ? 'dashboard' : null
}

/**
 * Where the service navigation's Dashboard item points. Inside a set that is
 * the set's own dashboard, so the item leads back to the journey the reader is
 * in rather than to the chooser; a server-wide page has no set, so it falls
 * back to `/`.
 *
 * @returns {string} the dashboard href for the current request.
 */
export function dashboardHref() {
  return hasSetContext() ? dashboardPath() : '/'
}

/**
 * Read a set-owned fact for the request being rendered.
 *
 * The view is rendered after the response is built, and the store the gateway
 * entered at `onPreAuth` has not always survived that far — with one set
 * mounted the sole-set fallback hides it, with two the set simply cannot be
 * resolved. The request path still carries the mount prefix, so match it
 * against the registered mounts and read inside that set.
 *
 * @param {string} requestPath - the request path.
 * @param {Function} read - the set-owned read.
 * @returns {*} whatever `read` returns.
 */
const inSetOfRequest = (requestPath, read) => {
  if (hasSetContext()) {
    return read()
  }
  const setId = setIdForPath(requestPath)
  return setId ? withSetContext(setId, read) : read()
}

async function context(request) {
  if (!webpackManifest) {
    try {
      webpackManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Webpack ${path.basename(manifestPath)} not found`)
    }
  }

  // If the user is authenticated, add the user's details to the view context
  // This allows the view to display the user's session details and the ability to conditionally render content
  const sessionId = request.auth?.credentials?.sessionId
  const authData = sessionId
    ? await request.server.app.cache.get(sessionId)
    : null

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    dashboardHref: inSetOfRequest(request.path, dashboardHref),
    authEnabled: config.get('auth.enabled'),
    staleActionRejected: request.query?.staleAction === '1',
    activeNavigationItem: inSetOfRequest(request.path, () =>
      activeNavigationItem(request.path)
    ),
    userSession: authData
      ? {
          isAuthenticated: true,
          displayName: authData.displayName || authData.email || 'User',
          email: authData.email
        }
      : {
          isAuthenticated: false
        },
    getAssetPath(asset) {
      const webpackAssetPath = webpackManifest?.[asset]
      return `${assetPath}/${webpackAssetPath ?? asset}`
    }
  }
}

export { context }
