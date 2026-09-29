/**
 * The shared password in front of the whole prototype, driven through the
 * real server the way a browser would reach it: with no password set the
 * prototype is open as it always was; with one set, every page but the health
 * check, the password page and its assets sends a stranger to the password
 * page first.
 */
import Hapi from '@hapi/hapi'
import { load } from 'cheerio'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { createServer } from '../server.js'
import { SET_BASE as PLANTS_BASE } from '../app/sets/high-risk-plants/set.js'
import { prototypePasswordConfig } from './config.js'
import { prototypePassword } from './index.js'
import {
  COOKIE_NAME,
  COOKIE_TTL_MS,
  PASSWORD_PATH,
  SIGN_OUT_PATH
} from './paths.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const PASSWORD = 'correct horse battery staple'
const NEW_PASSWORD = 'a different shared password'
const REDIRECT_FOUND = 302
const ONE_DAY_MS = 86_400_000
const EXAMPLE_LINK = '/examples/high-risk-plants/submitted'
const ERROR_SUMMARY = '.govuk-error-summary'
const RETURN_URL_FIELD = 'input[name="returnUrl"]'
const WRONG_PASSWORD_MESSAGE = 'The password is not correct'
const EMPTY_PASSWORD_MESSAGE = 'Enter the password'

const buildServer = async (password) => {
  prototypePasswordConfig.set('password', password)
  const server = await createServer()
  await server.initialize()
  return server
}

/**
 * One real server for the enclosing describe block, built with the password
 * given and stopped after it.
 */
const serverForSuite = (password) => {
  const suite = {}
  beforeAll(async () => {
    suite.server = await buildServer(password)
  })
  afterAll(async () => {
    await suite.server.stop({ timeout: 0 })
  })
  return suite
}

const setCookiesOf = (response) => {
  const header = response.headers['set-cookie'] ?? []
  return Array.isArray(header) ? header : [header]
}

const passwordSetCookieOf = (response) =>
  setCookiesOf(response).find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))

const passwordCookieOf = (response) =>
  passwordSetCookieOf(response)?.split(';')[0]

const withCookie = (cookie) => ({ headers: { cookie } })

const enterPassword = (server, password, returnUrl) =>
  server.inject({
    method: 'POST',
    url: PASSWORD_PATH,
    payload: { password, ...(returnUrl !== undefined && { returnUrl }) }
  })

const signInWithPassword = async (server, password = PASSWORD) =>
  passwordCookieOf(await enterPassword(server, password, '/'))

const passwordPageAsking = (returnUrl) =>
  `${PASSWORD_PATH}?returnUrl=${encodeURIComponent(returnUrl)}`

const expectSentToPasswordPage = (response, location = PASSWORD_PATH) => {
  expect(response.statusCode).toBe(REDIRECT_FOUND)
  expect(response.headers.location).toBe(location)
}

afterAll(() => {
  prototypePasswordConfig.set('password', '')
})

describe('with no password set', () => {
  const suite = serverForSuite('')

  it('Should show the chooser to anyone, as it always has', async () => {
    const response = await suite.server.inject('/')

    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it('Should send a stranger to sign-in, not to a password page', async () => {
    const response = await suite.server.inject(PLANTS_BASE)

    expect(response.statusCode).toBe(REDIRECT_FOUND)
    expect(response.headers.location).toMatch(/^\/auth\/sign-in/)
  })

  it('Should not serve a password page at all', async () => {
    const response = await suite.server.inject(PASSWORD_PATH)

    expect(response.statusCode).toBe(statusCodes.notFound)
  })
})

describe('with a password set, a stranger with no cookie', () => {
  const suite = serverForSuite(PASSWORD)

  it.each([
    ['the chooser', '/', PASSWORD_PATH],
    ['a set', PLANTS_BASE, passwordPageAsking(PLANTS_BASE)],
    ['stub sign-in', '/auth/sign-in', passwordPageAsking('/auth/sign-in')],
    ['an example link', EXAMPLE_LINK, passwordPageAsking(EXAMPLE_LINK)],
    [
      'a page with a query',
      `${PLANTS_BASE}?tab=drafts`,
      passwordPageAsking(`${PLANTS_BASE}?tab=drafts`)
    ],
    [
      'a page that does not exist',
      '/no-such-page',
      passwordPageAsking('/no-such-page')
    ]
  ])(
    'Should be sent from %s to the password page',
    async (_name, url, location) => {
      const response = await suite.server.inject(url)

      expectSentToPasswordPage(response, location)
    }
  )

  it('Should be sent from a form post to the password page without a return address', async () => {
    const response = await suite.server.inject({
      method: 'POST',
      url: '/reset/high-risk-plants'
    })

    expectSentToPasswordPage(response)
  })

  it('Should still reach the health check', async () => {
    const response = await suite.server.inject('/health')

    expect(response.statusCode).toBe(statusCodes.ok)
  })

  it.each(['/public/stylesheets/not-built.css', '/favicon.ico'])(
    'Should reach the asset %s the password page needs',
    async (url) => {
      const response = await suite.server.inject(url)

      expect(response.statusCode).not.toBe(REDIRECT_FOUND)
    }
  )

  it('Should not reach a page by climbing out of the asset path', async () => {
    const response = await suite.server.inject(`/public/..${PLANTS_BASE}`)

    expect(response.statusCode).not.toBe(statusCodes.ok)
  })
})

describe('the password page', () => {
  const suite = serverForSuite(PASSWORD)

  it('Should ask for the password with GOV.UK components', async () => {
    const response = await suite.server.inject(passwordPageAsking(PLANTS_BASE))
    const $ = load(response.result)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect($('h1').text()).toBe('This is a prototype')
    expect($('input#password').attr('type')).toBe('password')
    expect($('label[for="password"]').text().trim()).toBe('Password')
    expect($(RETURN_URL_FIELD).val()).toBe(PLANTS_BASE)
    expect($(ERROR_SUMMARY)).toHaveLength(0)
  })

  it('Should say to enter the password when none is given', async () => {
    const response = await enterPassword(suite.server, '', PLANTS_BASE)
    const $ = load(response.result)

    expect(response.statusCode).toBe(statusCodes.badRequest)
    expect($('title').text()).toMatch(/^Error: /)
    expect($(ERROR_SUMMARY).text()).toContain(EMPTY_PASSWORD_MESSAGE)
    expect($(`${ERROR_SUMMARY} a`).attr('href')).toBe('#password')
    expect($('#password-error').text()).toContain(EMPTY_PASSWORD_MESSAGE)
    expect(passwordCookieOf(response)).toBeUndefined()
  })

  it('Should say the password is not correct, and keep the return address', async () => {
    const response = await enterPassword(suite.server, 'wrong', PLANTS_BASE)
    const $ = load(response.result)

    expect(response.statusCode).toBe(statusCodes.badRequest)
    expect($(ERROR_SUMMARY).text()).toContain(WRONG_PASSWORD_MESSAGE)
    expect($('#password-error').text()).toContain(WRONG_PASSWORD_MESSAGE)
    expect($(RETURN_URL_FIELD).val()).toBe(PLANTS_BASE)
    expect(passwordCookieOf(response)).toBeUndefined()
  })

  it('Should remember the right password and go back to the page first asked for', async () => {
    const response = await enterPassword(suite.server, PASSWORD, PLANTS_BASE)
    const setCookie = passwordSetCookieOf(response)

    expect(response.statusCode).toBe(REDIRECT_FOUND)
    expect(response.headers.location).toBe(PLANTS_BASE)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain(`Max-Age=${COOKIE_TTL_MS / 1000}`)
    expect(setCookie).not.toContain(PASSWORD)
    expect(setCookie).not.toContain(encodeURIComponent(PASSWORD))
  })

  it.each([
    '//evil.example',
    'https://evil.example',
    '/\\evil.example',
    `${PASSWORD_PATH}?returnUrl=%2F`
  ])('Should go to / rather than to %s', async (returnUrl) => {
    const response = await enterPassword(suite.server, PASSWORD, returnUrl)

    expect(response.statusCode).toBe(REDIRECT_FOUND)
    expect(response.headers.location).toBe('/')
  })

  it('Should not offer an unsafe return address on the page either', async () => {
    const response = await suite.server.inject(
      passwordPageAsking('https://evil.example')
    )
    const $ = load(response.result)

    expect($(RETURN_URL_FIELD).val()).toBe('/')
  })

  describe('with CSRF protection on, as when deployed', () => {
    beforeAll(() => {
      config.set('csrf.enabled', true)
    })

    afterAll(() => {
      config.set('csrf.enabled', false)
    })

    it('Should accept the form as the page renders it, crumb and all', async () => {
      const page = await suite.server.inject(PASSWORD_PATH)
      const $ = load(page.result)
      const crumbCookie = setCookiesOf(page)
        .find((cookie) => cookie.startsWith('crumb='))
        .split(';')[0]

      const response = await suite.server.inject({
        method: 'POST',
        url: PASSWORD_PATH,
        headers: { cookie: crumbCookie },
        payload: {
          crumb: $('input[name="crumb"]').val(),
          returnUrl: $(RETURN_URL_FIELD).val(),
          password: PASSWORD
        }
      })

      expect(response.statusCode).toBe(REDIRECT_FOUND)
      expect(passwordCookieOf(response)).toBeDefined()
    })

    it('Should refuse the form without its crumb', async () => {
      const response = await enterPassword(suite.server, PASSWORD, '/')

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect(passwordCookieOf(response)).toBeUndefined()
    })
  })
})

describe('a visitor who has given the password', () => {
  const suite = serverForSuite(PASSWORD)

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Should see every page, then sign in as usual', async () => {
    const cookie = await signInWithPassword(suite.server)

    const chooser = await suite.server.inject({
      url: '/',
      ...withCookie(cookie)
    })
    const set = await suite.server.inject({
      url: PLANTS_BASE,
      ...withCookie(cookie)
    })

    expect(chooser.statusCode).toBe(statusCodes.ok)
    expect(set.statusCode).toBe(REDIRECT_FOUND)
    expect(set.headers.location).toMatch(/^\/auth\/sign-in/)
  })

  it('Should be refused with a tampered cookie', async () => {
    const cookie = await signInWithPassword(suite.server)
    const [name, value] = cookie.split('=')
    const [id, expiresAt, signature] = value.split('.')
    const flipped = signature.at(-1) === 'A' ? 'B' : 'A'
    const tampered = [
      `${name}=${id}.${expiresAt}.${signature.slice(0, -1)}${flipped}`,
      `${name}=${id}.${Number(expiresAt) + 1}.${signature}`,
      `${name}=someone-else.${expiresAt}.${signature}`,
      `${name}=not-a-token`
    ]

    const responses = await Promise.all(
      tampered.map((forged) =>
        suite.server.inject({ url: '/', ...withCookie(forged) })
      )
    )

    for (const response of responses) {
      expectSentToPasswordPage(response)
    }
  })

  it('Should ask for the password again once the cookie has expired', async () => {
    const cookie = await signInWithPassword(suite.server)
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + COOKIE_TTL_MS + ONE_DAY_MS)

    const response = await suite.server.inject({
      url: '/',
      ...withCookie(cookie)
    })

    expectSentToPasswordPage(response)
  })

  it('Should forget the password on sign-out', async () => {
    const response = await suite.server.inject(SIGN_OUT_PATH)

    expectSentToPasswordPage(response)
    expect(passwordSetCookieOf(response)).toContain('Max-Age=0')
  })

  it('Should leave boot-time seeding replaying the examples through the set’s own pages', async () => {
    const { seedHighRiskPlants } =
      await import('../prototype-seed/seed-high-risk-plants.js')

    const journeyIds = await seedHighRiskPlants(suite.server)

    expect(journeyIds.length).toBeGreaterThan(0)
  })
})

describe('when the password is changed', () => {
  let oldServer
  let newServer

  beforeAll(async () => {
    oldServer = await buildServer(PASSWORD)
  })

  afterAll(async () => {
    await oldServer.stop({ timeout: 0 })
    await newServer?.stop({ timeout: 0 })
  })

  it('Should refuse a cookie made under the old password, and accept the new one', async () => {
    const oldCookie = await signInWithPassword(oldServer, PASSWORD)
    newServer = await buildServer(NEW_PASSWORD)

    const withOld = await newServer.inject({
      url: '/',
      ...withCookie(oldCookie)
    })
    const newCookie = await signInWithPassword(newServer, NEW_PASSWORD)
    const withNew = await newServer.inject({
      url: '/',
      ...withCookie(newCookie)
    })

    expectSentToPasswordPage(withOld)
    expect(withNew.statusCode).toBe(statusCodes.ok)
  })
})

describe('the start-up line', () => {
  const registerLogging = async (password) => {
    prototypePasswordConfig.set('password', password)
    const info = vi.spyOn(createLogger(), 'info').mockReturnValue(undefined)
    await Hapi.server().register(prototypePassword)
    return info
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Should say the prototype is open when no password is set', async () => {
    const info = await registerLogging('')

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('the prototype is open to anyone')
    )
  })

  it('Should say the password is on, without saying it, when one is set', async () => {
    const info = await registerLogging(PASSWORD)

    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('Prototype password: on')
    )
    expect(info).not.toHaveBeenCalledWith(expect.stringContaining(PASSWORD))
  })
})
