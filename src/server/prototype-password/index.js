import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { prototypePasswordConfig } from './config.js'
import { passwordRoutes } from './controller.js'
import { acceptedPasswordsFrom, isAcceptedToken } from './password-token.js'
import {
  COOKIE_NAME,
  COOKIE_TTL_MS,
  PASSWORD_PATH,
  SIGN_OUT_PATH
} from './paths.js'

const logger = createLogger()

const HEALTH_PATH = '/health'
const FAVICON_PATH = '/favicon.ico'
const RETURNABLE_METHODS = new Set(['get', 'head'])

/**
 * The paths a visitor reaches without the password: CDP's health check, the
 * password page itself, and the built assets that page needs to look like
 * GOV.UK. The assets are the compiled bundle every visitor is sent anyway, and
 * hold no prototype content.
 */
const isOpenPath = (path, assetPath) =>
  path === HEALTH_PATH ||
  path === PASSWORD_PATH ||
  path === SIGN_OUT_PATH ||
  path === FAVICON_PATH ||
  path.startsWith(`${assetPath}/`)

/**
 * The password page, carrying the page first asked for so the visitor comes
 * back to it. Only a GET or HEAD is sent back: a gated form post would come
 * back as a GET on a URL that only handles posts.
 */
const passwordPageFor = (request) => {
  const asked = `${request.url.pathname}${request.url.search}`
  if (!RETURNABLE_METHODS.has(request.method) || asked === '/') {
    return PASSWORD_PATH
  }
  return `${PASSWORD_PATH}?returnUrl=${encodeURIComponent(asked)}`
}

/**
 * The password cookie's value, read straight off the request's Cookie header.
 * The gate runs before hapi parses cookies, and this one cookie is plain text.
 */
const passwordCookieOf = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((pair) => pair.trim())
    .find((pair) => pair.startsWith(`${COOKIE_NAME}=`))
    ?.slice(COOKIE_NAME.length + 1)

/**
 * Stops every request that has not given the password, before routing, so a
 * path that matches no route is stopped too, and before sign-in or any route
 * runs.
 *
 * A request the server injects into itself with credentials passes: that is
 * boot-time seeding and the release-render check replaying real pages, and no
 * browser can send one.
 */
const passwordGate =
  ({ acceptedPasswords, serverSecret, assetPath }) =>
  (request, h) => {
    if (request.auth.isInjected || isOpenPath(request.path, assetPath)) {
      return h.continue
    }
    const token = passwordCookieOf(request.headers.cookie)
    if (isAcceptedToken({ serverSecret, acceptedPasswords, token })) {
      return h.continue
    }
    return h.redirect(passwordPageFor(request)).takeover()
  }

const cookieOptions = () => ({
  ttl: COOKIE_TTL_MS,
  path: '/',
  isSecure: config.get('session.cookie.secure'),
  isHttpOnly: true,
  isSameSite: 'Lax',
  encoding: 'none',
  clearInvalid: true,
  ignoreErrors: true
})

/**
 * A shared password in front of the whole prototype, the way the GOV.UK
 * Prototype Kit protects a deployed prototype. On only when
 * `PROTOTYPE_PASSWORD` is set (a CDP secret on the deployed prototype);
 * otherwise the prototype is open, as it always has been, and says so once at
 * start-up.
 *
 * Read at registration, not import, so each server built reads the password
 * as it is then.
 */
export const prototypePassword = {
  plugin: {
    name: 'prototype-password',
    register(server) {
      const acceptedPasswords = acceptedPasswordsFrom(
        prototypePasswordConfig.get('password')
      )
      if (acceptedPasswords.length === 0) {
        logger.info(
          'Prototype password: PROTOTYPE_PASSWORD is not set, so the prototype is open to anyone who reaches it'
        )
        return
      }

      const serverSecret = config.get('session.cookie.password')
      server.state(COOKIE_NAME, cookieOptions())
      server.route(passwordRoutes({ acceptedPasswords, serverSecret }))
      server.ext(
        'onRequest',
        passwordGate({
          acceptedPasswords,
          serverSecret,
          assetPath: config.get('assetPath')
        })
      )
      logger.info(
        'Prototype password: on. Every page but /health needs the password'
      )
    }
  }
}
