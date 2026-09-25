/**
 * A tiny stateful HTTP client over `server.inject`, for driving a journey
 * through its own routes the way a browser would — the same route handlers,
 * the same `state.commit`/records calls, just without a browser or Playwright.
 *
 * Boot-time seeding has no request of its own to carry a session on, so this
 * carries one across a sequence of injected calls: every `Set-Cookie` a
 * response sends is remembered and replayed on the next request, the way a
 * browser's cookie jar would.
 *
 * Given `credentials`, every request is authenticated as them through hapi's
 * own `inject` `auth` option rather than through a sign-in route, so the
 * client works the same whichever way the server signs people in: stub
 * sign-in locally, Defra ID when deployed.
 */
const setCookiePairs = (response) => {
  const raw = response.headers['set-cookie']
  if (!raw) {
    return []
  }
  return (Array.isArray(raw) ? raw : [raw]).map((entry) => entry.split(';')[0])
}

export const createSeedClient = (server, { credentials } = {}) => {
  const jar = new Map()

  const cookieHeader = () =>
    [...jar.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

  const auth = credentials ? { strategy: 'session', credentials } : undefined

  const request = async ({ method, url, payload }) => {
    const response = await server.inject({
      method,
      url,
      payload,
      headers: { cookie: cookieHeader() },
      ...(auth && { auth })
    })
    for (const pair of setCookiePairs(response)) {
      const separator = pair.indexOf('=')
      if (separator > 0) {
        jar.set(pair.slice(0, separator), pair.slice(separator + 1))
      }
    }
    return response
  }

  const get = (url) => request({ method: 'GET', url })

  const post = async (url, fields) =>
    request({
      method: 'POST',
      url,
      payload: { ...fields, crumb: jar.get('crumb') }
    })

  return { get, post }
}
