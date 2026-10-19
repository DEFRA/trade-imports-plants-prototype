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

describe('page maturity banner in the layout', () => {
  describe('when the page has no level', () => {
    it('Should show one Alpha phase banner exactly as before', () => {
      const $ = load(renderLayout())
      const banner = $(PHASE_BANNER)

      expect(banner).toHaveLength(1)
      expect(banner.find(TAG)).toHaveLength(1)
      expect(normalised(banner.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(environment.render('page-maturity/banner.njk', {})).toBe('')
    })
  })

  describe('when the page has a level', () => {
    const levelBannerOf = () =>
      load(renderLayout({ pageMaturity: exploring }))(PHASE_BANNER)

    it('Should add a second phase banner for the level, after the Alpha one', () => {
      const banners = levelBannerOf()
      const alpha = banners.eq(0)
      const level = banners.eq(1)
      const levelTag = level.find(TAG)

      expect(banners).toHaveLength(2)
      expect(normalised(alpha.text())).toBe(`Alpha ${SERVICE_SENTENCE}`)
      expect(levelTag).toHaveLength(1)
      expect(levelTag.hasClass(TAG_CLASSES.exploring)).toBe(true)
      expect(levelTag.hasClass('govuk-phase-banner__content__tag')).toBe(true)
      expect(normalised(level.text())).toBe(
        `${copy.hiddenPrefix} ${copy.levels.exploring.tag}. ${copy.levels.exploring.text}`
      )
    })

    it.each(Object.values(LEVELS))(
      'Should give the %s row its own modifier class and tag colour',
      (levelId) => {
        const banners = load(
          renderLayout({ pageMaturity: pageMaturityFor(levelId) })
        )(PHASE_BANNER)

        expect(banners.eq(1).hasClass(BANNER_CLASSES[levelId])).toBe(true)
        expect(banners.eq(1).find(TAG).hasClass(TAG_CLASSES[levelId])).toBe(
          true
        )
        expect(banners.eq(0).attr('class')).not.toContain('app-page-maturity')
      }
    )

    it('Should leave no line break or spacing utilities in the level row', () => {
      const level = levelBannerOf().eq(1)

      expect(level.find('br')).toHaveLength(0)
      expect(level.html()).not.toContain('govuk-!-margin')
    })

    it('Should keep exactly one link, the feedback email', () => {
      const links = levelBannerOf().find('a')

      expect(links).toHaveLength(1)
      expect(links.attr('href')).toMatch(/^mailto:/)
    })

    it('Should read the hidden status prefix inside the tag, before the level', () => {
      const level = levelBannerOf().eq(1)
      const tag = level.find(TAG)

      expect(tag.find('.govuk-visually-hidden').first().text().trim()).toBe(
        copy.hiddenPrefix
      )
      expect(normalised(tag.text())).toBe(
        `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
      )
      expect(level.find('.govuk-phase-banner__text').text()).not.toContain(
        copy.hiddenPrefix
      )
    })

    it('Should keep the service sentence in the Alpha row', () => {
      expect(normalised(levelBannerOf().eq(0).text())).toContain(
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
    return load(response.result)
  }

  it('Should show the level in the phase banner when the switch is on', async () => {
    const $ = await getDashboard()
    const tags = $(PHASE_BANNER).find(TAG)

    expect($(PHASE_BANNER)).toHaveLength(2)
    expect(tags).toHaveLength(2)
    expect(normalised($(tags[1]).text())).toBe(
      `${copy.hiddenPrefix} ${copy.levels.exploring.tag}.`
    )
  })

  it('Should show only the Alpha tag when the switch is off', async () => {
    config.set('pageMaturityBanner.enabled', false)

    const $ = await getDashboard()

    expect($(PHASE_BANNER).find(TAG)).toHaveLength(1)
    expect($(PHASE_BANNER).text()).not.toContain(copy.levels.exploring.tag)
  })

  it('Should show only the Alpha tag on the not found page of a listed route', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `${SET_BASE}/notifications/no-such-notification/origin`,
      auth: { strategy: 'session', credentials: authenticatedCredentials }
    })
    const $ = load(response.result)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect($(PHASE_BANNER).find(TAG)).toHaveLength(1)
    expect($(PHASE_BANNER).text()).not.toContain(copy.levels.detailing.text)
  })
})
