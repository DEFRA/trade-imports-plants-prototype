import crypto from 'node:crypto'

const SHARED_PASSWORD_ID = 'shared'
const TOKEN_SEPARATOR = '.'
const TOKEN_PARTS = 3
const SIGNING_KEY_CONTEXT = 'prototype-password:'
const MS_PER_SECOND = 1000

/**
 * Every password the prototype accepts, each with an id the cookie can name.
 *
 * One today, from `PROTOTYPE_PASSWORD`. Several people with different access
 * would be more entries here, each with its own id; nothing else in the gate
 * assumes there is only one.
 *
 * @param {string} password - the configured shared password, empty when none.
 * @returns {Array<{id: string, password: string}>} the accepted passwords.
 */
export const acceptedPasswordsFrom = (password) =>
  password ? [{ id: SHARED_PASSWORD_ID, password }] : []

const sha256 = (text) => crypto.createHash('sha256').update(text).digest()

const hmac = (key, text) =>
  crypto.createHmac('sha256', key).update(text).digest()

const isSameDigest = (left, right) =>
  left.length === right.length && crypto.timingSafeEqual(left, right)

/**
 * The accepted password a submitted one matches, compared as digests in
 * constant time against every accepted password, without stopping at the
 * first match.
 *
 * @param {Array<{id: string, password: string}>} acceptedPasswords
 * @param {string} submitted - the password the visitor typed.
 * @returns {{id: string, password: string}|undefined} the match, if any.
 */
export const matchingPassword = (acceptedPasswords, submitted) => {
  const submittedDigest = sha256(submitted)
  return acceptedPasswords.filter((accepted) =>
    isSameDigest(sha256(accepted.password), submittedDigest)
  )[0]
}

/**
 * The key an accepted password's cookie is signed with. It depends on the
 * server's session secret and on the password itself, so a cookie cannot be
 * forged without both, and changing either one invalidates every cookie made
 * under the old value.
 */
const signingKeyFor = (serverSecret, accepted) =>
  hmac(serverSecret, `${SIGNING_KEY_CONTEXT}${accepted.password}`)

const signatureFor = (serverSecret, accepted, expiresAt) =>
  hmac(
    signingKeyFor(serverSecret, accepted),
    `${accepted.id}${TOKEN_SEPARATOR}${expiresAt}`
  ).toString('base64url')

/**
 * The cookie value that remembers a correct password: the accepted password's
 * id, the moment it stops being accepted, and a signature over both. Never the
 * password, nor a plain hash of it.
 *
 * @param {object} options
 * @param {string} options.serverSecret - the server's session cookie secret.
 * @param {{id: string, password: string}} options.accepted - the password used.
 * @param {number} options.ttlMs - how long the cookie is accepted for.
 * @param {number} [options.now] - the current time, in milliseconds.
 * @returns {string} the cookie value.
 */
export const tokenFor = ({
  serverSecret,
  accepted,
  ttlMs,
  now = Date.now()
}) => {
  const expiresAt = Math.floor((now + ttlMs) / MS_PER_SECOND)
  return [
    accepted.id,
    expiresAt,
    signatureFor(serverSecret, accepted, expiresAt)
  ].join(TOKEN_SEPARATOR)
}

const parseToken = (token) => {
  if (typeof token !== 'string') {
    return null
  }
  const parts = token.split(TOKEN_SEPARATOR)
  if (parts.length !== TOKEN_PARTS) {
    return null
  }
  const [id, expiresAtText, signature] = parts
  const expiresAt = Number(expiresAtText)
  return Number.isSafeInteger(expiresAt) ? { id, expiresAt, signature } : null
}

/**
 * Whether a cookie value was made by this server, under a password it still
 * accepts, and has not yet expired.
 *
 * @param {object} options
 * @param {string} options.serverSecret - the server's session cookie secret.
 * @param {Array<{id: string, password: string}>} options.acceptedPasswords
 * @param {unknown} options.token - the cookie value, as the browser sent it.
 * @param {number} [options.now] - the current time, in milliseconds.
 * @returns {boolean} true when the token is accepted.
 */
export const isAcceptedToken = ({
  serverSecret,
  acceptedPasswords,
  token,
  now = Date.now()
}) => {
  const parsed = parseToken(token)
  if (!parsed) {
    return false
  }
  if (parsed.expiresAt * MS_PER_SECOND <= now) {
    return false
  }
  const accepted = acceptedPasswords.find(({ id }) => id === parsed.id)
  if (!accepted) {
    return false
  }
  return isSameDigest(
    Buffer.from(signatureFor(serverSecret, accepted, parsed.expiresAt)),
    Buffer.from(parsed.signature)
  )
}
