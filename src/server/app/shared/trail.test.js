import { describe, expect, it } from 'vitest'

import {
  expectOneLogged,
  journeyRequest,
  trailRequestOf
} from '../engine/test-support.js'
import { dashboardPath, hubPath, pagePath } from './paths.js'
import {
  carryTrail,
  LONGEST_TRAIL,
  pushTrail,
  readReturnMarker,
  requestTrail,
  trailBackLink,
  withReturnMarker,
  withTrail
} from './trail.js'

const HREF = '/n/j-1/a'
const SCALARS_ROUTE_PATH = '/notifications/{journeyId}/scalars'
const REFUSED_RETURN = '//evil.example'
const OVERVIEW_THEN_SCALARS = 'overview,scalars'
const UNRECOGNISED_TRAIL_MESSAGE = 'Trail not recognised, trail dropped'

describe('the trail of places the trader came from', () => {
  const trailRequest = (trail, overrides = {}) =>
    journeyRequest('j-1', {
      query: trail === undefined ? {} : { from: trail },
      ...overrides
    })

  describe('#pushTrail', () => {
    it('Should start the trail on an href without one', () => {
      expect(pushTrail(trailRequest(), HREF, 'scalars')).toBe(
        `${HREF}?from=scalars`
      )
    })

    it('Should add the place after the request’s trail and join an href’s own query', () => {
      expect(
        pushTrail(trailRequest(OVERVIEW_THEN_SCALARS), `${HREF}?x=1`, 'items')
      ).toBe(`${HREF}?x=1&from=overview%2Cscalars%2Citems`)
    })

    it('Should lose the oldest place of a trail past the longest', () => {
      const longestTrail = [
        'overview',
        ...Array.from({ length: LONGEST_TRAIL - 1 }, () => 'scalars')
      ]
      const pushedHref = pushTrail(trailRequestOf(longestTrail), '/x', 'items')

      const pushed = requestTrail(
        trailRequestOf(
          new URL(pushedHref, 'http://t.test').searchParams
            .get('from')
            .split(',')
        )
      )

      expect(pushed).toHaveLength(LONGEST_TRAIL)
      expect(pushed.at(0)).toBe('scalars')
      expect(pushed.at(-1)).toBe('items')
    })

    it('Should point Back at the newest place of a trail, carrying the places before it', () => {
      const request = trailRequestOf(['overview', 'scalars', 'items'])

      expect(trailBackLink(request)).toBe(
        '/high-risk-plants/notifications/j-1/items?from=overview%2Cscalars'
      )
    })

    it('Should point Back at Overview from an empty trail', () => {
      expect(trailBackLink(trailRequestOf([]))).toBe(
        '/high-risk-plants/notifications/j-1'
      )
    })
  })

  describe('#carryTrail', () => {
    it('Should leave an href as it is when the request carries no trail', () => {
      expect(carryTrail(trailRequest(), HREF)).toBe(HREF)
    })

    it('Should carry exactly the request’s trail', () => {
      expect(carryTrail(trailRequest(OVERVIEW_THEN_SCALARS), HREF)).toBe(
        `${HREF}?from=overview%2Cscalars`
      )
    })

    it('Should drop a trail that names a place the journey does not have, and log it once', () => {
      const request = trailRequest('https://elsewhere.test')

      expect(carryTrail(request, HREF)).toBe(HREF)
      expect(carryTrail(request, HREF)).toBe(HREF)
      expectOneLogged(request.logger, {
        level: 'warn',
        fields: expect.objectContaining({
          journeyId: 'j-1',
          trail: 'https://elsewhere.test'
        }),
        message: UNRECOGNISED_TRAIL_MESSAGE
      })
    })
  })

  describe('#withTrail', () => {
    it('Should leave an href as it is for an empty trail', () => {
      expect(withTrail(HREF, [])).toBe(HREF)
    })
  })

  describe('#trailBackLink', () => {
    it('Should go to the page on top of the trail, carrying the places beneath it', () => {
      expect(trailBackLink(trailRequest(OVERVIEW_THEN_SCALARS))).toBe(
        withTrail(pagePath('j-1', 'scalars'), ['overview'])
      )
    })

    it('Should go to Overview for a trail of Overview', () => {
      expect(trailBackLink(trailRequest('overview'))).toBe(hubPath('j-1'))
    })

    it('Should go to the dashboard for a trail of the dashboard', () => {
      expect(trailBackLink(trailRequest('dashboard'))).toBe(dashboardPath())
    })

    it('Should go to the Import Notification Service question for a trail of its start', () => {
      expect(trailBackLink(trailRequest('ins'))).toBe('/ins-question/j-1')
    })

    it('Should go to the given fallback when the request carries no trail, without logging', () => {
      const request = trailRequest()

      expect(trailBackLink(request, { fallback: '/fallback' })).toBe(
        '/fallback'
      )
      expect(request.logger.entries).toEqual([])
    })

    it('Should go to Overview when there is no trail and no fallback', () => {
      expect(trailBackLink(trailRequest())).toBe(hubPath('j-1'))
    })

    it.each([
      ['an unknown place', 'not-a-place'],
      ['an absolute URL', 'https://elsewhere.test/x'],
      ['an unknown place beneath a known one', 'not-a-place,scalars'],
      ['an empty trail', '']
    ])(
      'Should go to the fallback and log once for %s',
      (_description, trail) => {
        const request = trailRequest(trail, {
          route: { path: SCALARS_ROUTE_PATH }
        })

        expect(trailBackLink(request, { fallback: '/fallback' })).toBe(
          '/fallback'
        )
        expectOneLogged(request.logger, {
          level: 'warn',
          fields: {
            journeyId: 'j-1',
            route: SCALARS_ROUTE_PATH,
            trail,
            fallback: '/fallback'
          },
          message: UNRECOGNISED_TRAIL_MESSAGE
        })
      }
    )

    it('Should go to the fallback for a trail given more than once', () => {
      expect(
        trailBackLink(trailRequest(['overview', 'scalars']), {
          fallback: '/fallback'
        })
      ).toBe('/fallback')
    })
  })
})

describe('#withReturnMarker — the return marker on an href', () => {
  it('Should start the query string on an href without one', () => {
    expect(withReturnMarker('/a', 'applicant')).toBe('/a?return=applicant')
  })

  it('Should join to the query string an href already has', () => {
    expect(withReturnMarker('/a?x=1', 'applicant')).toBe(
      '/a?x=1&return=applicant'
    )
  })

  it('Should encode a slug that contains a slash', () => {
    expect(withReturnMarker('/a', 'consignment/contact')).toBe(
      '/a?return=consignment%2Fcontact'
    )
  })
})

describe('#readReturnMarker — the page a request says it came from', () => {
  const allowedSlugs = ['applicant', 'notification-view']
  const REFUSED_MARKER_MESSAGE = 'Return marker not recognised, marker dropped'
  const markerRequest = (query) =>
    journeyRequest('j-1', {
      query,
      route: { path: SCALARS_ROUTE_PATH }
    })

  it('Should be empty and log nothing when the request carries no marker', () => {
    const request = markerRequest({})

    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expect(request.logger.entries).toEqual([])
  })

  it('Should honour a marker naming an allowed slug and log nothing', () => {
    const request = markerRequest({ return: 'applicant' })

    expect(readReturnMarker(request, allowedSlugs)).toEqual({
      honouredSlug: 'applicant'
    })
    expect(request.logger.entries).toEqual([])
  })

  it('Should refuse a marker naming anything else and log it once at warn', () => {
    const request = markerRequest({ return: REFUSED_RETURN })

    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expect(readReturnMarker(request, allowedSlugs)).toEqual({})
    expectOneLogged(request.logger, {
      level: 'warn',
      fields: {
        journeyId: 'j-1',
        route: SCALARS_ROUTE_PATH,
        received: REFUSED_RETURN
      },
      message: REFUSED_MARKER_MESSAGE
    })
  })

  it('Should log a refused marker once on a request that carries no app', () => {
    const request = markerRequest({ return: REFUSED_RETURN }, { app: null })

    readReturnMarker(request, allowedSlugs)
    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries).toHaveLength(1)
  })

  it('Should log a refused marker cut to 200 characters', () => {
    const request = markerRequest({ return: 'x'.repeat(300) })

    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries[0].fields.received).toBe('x'.repeat(200))
  })

  it('Should log an unrecognised trail and a refused marker on one request once each', () => {
    const request = markerRequest({
      from: 'not-a-place',
      return: REFUSED_RETURN
    })

    requestTrail(request)
    readReturnMarker(request, allowedSlugs)

    expect(request.logger.entries.map(({ message }) => message)).toEqual([
      UNRECOGNISED_TRAIL_MESSAGE,
      REFUSED_MARKER_MESSAGE
    ])
  })
})
