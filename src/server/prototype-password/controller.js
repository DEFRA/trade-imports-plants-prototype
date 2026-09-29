import Joi from 'joi'

import { getSafeRedirect } from '../../auth/get-safe-redirect.js'
import { serverWideBase } from '../app/shared/kit.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { matchingPassword, tokenFor } from './password-token.js'
import {
  COOKIE_NAME,
  COOKIE_TTL_MS,
  PASSWORD_PATH,
  SIGN_OUT_PATH
} from './paths.js'

const PAGE_TITLE = 'This is a prototype'
const TEMPLATE = 'prototype-password/template'
const MAX_RETURN_URL_LENGTH = 2048
const MAX_PASSWORD_LENGTH = 1024

const ERRORS = Object.freeze({
  empty: 'Enter the password',
  wrong: 'The password is not correct'
})

const isUnderPasswordPage = (path) =>
  path === PASSWORD_PATH ||
  path.startsWith(`${PASSWORD_PATH}/`) ||
  path.startsWith(`${PASSWORD_PATH}?`)

/**
 * Where to go once the password is accepted: the page first asked for, as long
 * as it is a path on this site and not the password page itself.
 *
 * @param {unknown} returnUrl - the return address from the query or the form.
 * @returns {string} a safe relative path.
 */
export const safeReturnUrl = (returnUrl) => {
  const safe = getSafeRedirect(returnUrl)
  return isUnderPasswordPage(safe) ? '/' : safe
}

const errorSummaryFor = (errorMessage) => ({
  titleText: 'There is a problem',
  errorList: [{ text: errorMessage, href: '#password' }]
})

const passwordPage = (h, { returnUrl, errorMessage }) =>
  h.view(TEMPLATE, {
    ...serverWideBase(PAGE_TITLE),
    heading: PAGE_TITLE,
    returnUrl: safeReturnUrl(returnUrl),
    errorMessage,
    errorSummary: errorMessage ? errorSummaryFor(errorMessage) : null
  })

const returnUrlSchema = Joi.string().allow('').max(MAX_RETURN_URL_LENGTH)

/**
 * The password page, its form post, and a way to forget the password.
 *
 * @param {object} options
 * @param {Array<{id: string, password: string}>} options.acceptedPasswords
 * @param {string} options.serverSecret - the server's session cookie secret.
 * @returns {object[]} the routes.
 */
export const passwordRoutes = ({ acceptedPasswords, serverSecret }) => [
  {
    method: 'GET',
    path: PASSWORD_PATH,
    options: {
      auth: false,
      validate: {
        query: Joi.object({ returnUrl: returnUrlSchema })
      }
    },
    handler: (request, h) =>
      passwordPage(h, { returnUrl: request.query.returnUrl })
  },
  {
    method: 'POST',
    path: PASSWORD_PATH,
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          password: Joi.string().allow('').max(MAX_PASSWORD_LENGTH),
          returnUrl: returnUrlSchema,
          crumb: Joi.string()
        })
      }
    },
    handler: (request, h) => {
      const { password = '', returnUrl } = request.payload ?? {}
      if (password === '') {
        return passwordPage(h, {
          returnUrl,
          errorMessage: ERRORS.empty
        }).code(statusCodes.badRequest)
      }
      const accepted = matchingPassword(acceptedPasswords, password)
      if (!accepted) {
        request.logger.info('Prototype password: a wrong password was entered')
        return passwordPage(h, {
          returnUrl,
          errorMessage: ERRORS.wrong
        }).code(statusCodes.badRequest)
      }
      return h
        .redirect(safeReturnUrl(returnUrl))
        .state(
          COOKIE_NAME,
          tokenFor({ serverSecret, accepted, ttlMs: COOKIE_TTL_MS })
        )
    }
  },
  {
    method: 'GET',
    path: SIGN_OUT_PATH,
    options: { auth: false },
    handler: (_request, h) => h.redirect(PASSWORD_PATH).unstate(COOKIE_NAME)
  }
]
