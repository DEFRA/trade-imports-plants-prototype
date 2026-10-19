import { afterEach, describe, expect, it } from 'vitest'

import { config } from '../../../config/config.js'
import { copy } from './copy/copy.en.js'
import { BANNER_CLASSES, LEVELS, TAG_CLASSES } from './levels.js'
import { pageLevelFor, pageMaturityContext } from './page-maturity.js'

const FLAG = 'pageMaturityBanner.enabled'
const JOURNEY = '/high-risk-plants/notifications/{journeyId}'
const LISTED_ROUTE = `${JOURNEY}/commodity-type`

const requestFor = (path) => ({ route: { path } })

describe('#pageLevelFor', () => {
  it.each([
    '/high-risk-plants',
    JOURNEY,
    `${JOURNEY}/commodity-type`,
    `${JOURNEY}/notification-view`,
    `${JOURNEY}/declaration`,
    `${JOURNEY}/confirmation`,
    '/auth/sign-out'
  ])('Should make %s Exploring, like every plants page', (routePath) => {
    expect(pageLevelFor(routePath)).toBe(LEVELS.exploring)
  })

  it.each([undefined, ''])(
    'Should return undefined for the path %j',
    (routePath) => {
      expect(pageLevelFor(routePath)).toBeUndefined()
    }
  )

  describe('with a section', () => {
    const sections = [{ section: '/example/section', level: LEVELS.detailing }]
    const NEW_PAGE = '/example/section/new'

    it.each([
      '/example/section',
      NEW_PAGE,
      '/example/section/{journeyId}/child'
    ])('Should treat %s as in the section', (path) => {
      expect(pageLevelFor(path, sections)).toBe(LEVELS.detailing)
    })

    it.each(['/example/sectionsomething', '/other'])(
      'Should return undefined for %s, which is not in the section',
      (path) => {
        expect(pageLevelFor(path, sections)).toBeUndefined()
      }
    )

    it('Should let an exact page entry win over the section that holds it', () => {
      expect(
        pageLevelFor(NEW_PAGE, sections, {
          [NEW_PAGE]: LEVELS.agreed
        })
      ).toBe(LEVELS.agreed)
    })

    it('Should use the first section that holds the route', () => {
      expect(
        pageLevelFor(NEW_PAGE, [
          ...sections,
          { section: '/', level: LEVELS.exploring }
        ])
      ).toBe(LEVELS.detailing)
    })
  })
})

describe('#pageMaturityContext', () => {
  const initial = config.get(FLAG)

  afterEach(() => {
    config.set(FLAG, initial)
  })

  it('Should default the switch to on', () => {
    expect(config.default(FLAG)).toBe(true)
  })

  it('Should return the tag, class, line and hidden prefix for a page with a level', () => {
    expect(pageMaturityContext(requestFor(LISTED_ROUTE))).toEqual({
      pageMaturity: {
        tag: {
          text: copy.levels.exploring.tag,
          classes: TAG_CLASSES.exploring
        },
        text: copy.levels.exploring.text,
        classes: BANNER_CLASSES.exploring,
        hiddenPrefix: copy.hiddenPrefix
      }
    })
  })

  it('Should return nothing when the switch is off', () => {
    config.set(FLAG, false)

    expect(pageMaturityContext(requestFor(LISTED_ROUTE))).toEqual({})
  })

  it('Should return nothing when the error page is rendered on a page with a level', () => {
    expect(
      pageMaturityContext({
        ...requestFor(LISTED_ROUTE),
        response: { source: { template: 'shared/error' } }
      })
    ).toEqual({})
  })

  it('Should return nothing for a request with no route', () => {
    expect(pageMaturityContext({})).toEqual({})
  })
})
