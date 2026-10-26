import { JSDOM } from 'jsdom'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi
} from 'vitest'

import { config } from '../../../config/config.js'
import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { mockOidcConfig } from '../../common/test-helpers/mock-oidc-config.js'
import { authenticatedCredentials } from '../engine/test-support.js'
import { copy as sharedCopy } from '../shared/copy.en.js'
import { SET_BASE } from '../sets/high-risk-plants/set.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = '.govuk-phase-banner'
const TAG = '.govuk-tag'
const SERVICE_SENTENCE =
  'This is a new service. Help us improve it and give your feedback by email.'

const pageMaturityFor = (level) => ({
  tag: { text: copy.levels[level].tag, classes: TAG_CLASSES[level] },
  text: copy.levels[level].text,
  classes: BANNER_CLASSES[level],
  hiddenPrefix: copy.hiddenPrefix
})

const exploring = pageMaturityFor(LEVELS.exploring)

const renderLayout = (context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession: { isAuthenticated: false },
    homeUrl: SET_BASE,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const normalised = (text) => text.replace(/\s+/g, ' ').trim()

const parse = (html) => new JSDOM(html).window.document

const textOf = (elements) =>
  [...elements].map((element) => element.textContent).join('')

describe('page maturity banner in the layout', () => {
  describe('when the page has no level', () => {
    it('Should show one Alpha phase banner exactly as before', () => {
      const banners = parse(renderLayout()).querySelectorAll(PHASE_BANNER)

      expect(banners).toHaveLength(1)
      expect(banners[0].querySelectorAll(TAG)).toHaveLength(1)
      expect(normalised(banners[0].textContent)).toBe(
        `Alpha ${SERVICE_SENTENCE}`
      )
      expect(environment.render('page-maturity/banner.njk', {})).toBe('')
    })
  })

  describe('when the page has a level', () => {
    const levelBannersOf = () =>
      parse(renderLayout({ pageMaturity: exploring })).querySelectorAll(
        PHASE_BANNER
      )

    it('Should add a second phase banner for the level, after the Alpha one', () => {
      const banners = levelBannersOf()
      const [alpha, level] = banners
      const levelTags = level.querySelectorAll(TAG)

      expect(banners).toHaveLength(2)
      expect(normalised(alpha.textContent)).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(levelTags).toHaveLength(1)
      expect(levelTags[0].classList.contains(TAG_CLASSES.exploring)).toBe(true)
      expect(
        levelTags[0].classList.contains('govuk-phase-banner__content__tag')
      ).toBe(true)
      expect(normalised(level.textContent)).toBe(
        `${copy.hiddenPrefix} ${copy.levels.exploring.tag}. ${copy.levels.exploring.text}`
      )
    })

    it.each(Object.values(LEVELS))(
      'Should give the %s row its own modifier class and tag colour',
      (levelId) => {
        const [alpha, level] = parse(
          renderLayout({ pageMaturity: pageMaturityFor(levelId) })
        ).querySelectorAll(PHASE_BANNER)

        expect(level.classList.contains(BANNER_CLASSES[levelId])).toBe(true)
        expect(
          level.querySelector(TAG).classList.contains(TAG_CLASSES[levelId])
        ).toBe(true)
        expect(alpha.getAttribute('class')).not.toContain('app-page-maturity')
      }
    )

    it('Should leave no line break or spacing utilities in the level row', () => {
      const level = levelBannersOf()[1]

      expect(level.querySelectorAll('br')).toHaveLength(0)
      expect(level.innerHTML).not.toContain('govuk-!-margin')
    })

    it('Should keep exactly one link, the feedback email', () => {
      const links = [...levelBannersOf()].flatMap((banner) => [
        ...banner.querySelectorAll('a')
      ])

      expect(links).toHaveLength(1)
      expect(links[0].getAttribute('href')).toMatch(/^mailto:/)
    })

    it('Should read the hidden status prefix inside the tag, before the level', () => {
      const level = levelBannersOf()[1]
      const tag = level.querySelector(TAG)

      expect(
        tag.querySelector('.govuk-visually-hidden').textContent.trim()
      ).toBe(copy.hiddenPrefix)
      expect(normalised(tag.textContent)).toBe(
        `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
      )
      expect(
        textOf(level.querySelectorAll('.govuk-phase-banner__text'))
      ).not.toContain(copy.hiddenPrefix)
    })

    it('Should keep the service sentence in the Alpha row', () => {
      expect(normalised(levelBannersOf()[0].textContent)).toContain(
        SERVICE_SENTENCE
      )
    })
  })
})

describe('page maturity banner on a served page', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    config.set('pageMaturityBanner.enabled', true)
  })

  const getDashboard = async () => {
    const response = await server.inject({
      method: 'GET',
      url: SET_BASE,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })
    return parse(response.result)
  }

  it('Should show the level in the phase banner when the switch is on', async () => {
    const document = await getDashboard()
    const tags = document.querySelectorAll(`${PHASE_BANNER} ${TAG}`)

    expect(document.querySelectorAll(PHASE_BANNER)).toHaveLength(2)
    expect(tags).toHaveLength(2)
    expect(normalised(tags[1].textContent)).toBe(
      `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
    )
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set('pageMaturityBanner.enabled', false)

    const document = await getDashboard()

    expect(document.querySelectorAll(`${PHASE_BANNER} ${TAG}`)).toHaveLength(1)
    expect(textOf(document.querySelectorAll(PHASE_BANNER))).not.toContain(
      copy.levels.exploring.tag
    )
  })

  it('Should show only the Alpha tag on the not found page of a listed route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `${SET_BASE}/notifications/no-such-notification/origin`,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })
    const document = parse(response.result)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(document.querySelectorAll(`${PHASE_BANNER} ${TAG}`)).toHaveLength(1)
    expect(textOf(document.querySelectorAll(PHASE_BANNER))).not.toContain(
      copy.levels.detailing.text
    )
  })
})
