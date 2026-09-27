import { describe, expect, it } from 'vitest'

import { flowPagesOf, judgeResponse, pageUrl } from './release-render.js'

const BASE = '/plants-working'
const LABEL = "The 'origin' page"

const response = (statusCode, { location, template } = {}) => ({
  statusCode,
  headers: location ? { location } : {},
  request: { response: { source: template ? { template } : {} } }
})

describe('judgeResponse', () => {
  it('Should accept a page that answers 200', () => {
    expect(judgeResponse(response(200), BASE, LABEL)).toBeUndefined()
  })

  it('Should accept a designed redirect inside the set', () => {
    expect(
      judgeResponse(
        response(302, { location: `${BASE}/notifications/A1/commodity-type` }),
        BASE,
        LABEL
      )
    ).toBeUndefined()
  })

  it('Should refuse a half-registered page: listed in flow.js with no route', () => {
    expect(
      judgeResponse(response(404, { template: 'shared/error' }), BASE, LABEL)
    ).toBe(
      "The 'origin' page showed the error page (404): no route answers it. A page listed in flow.js needs its controller routes added to the features index."
    )
  })

  it('Should refuse a page whose template or controller breaks', () => {
    expect(
      judgeResponse(response(500, { template: 'shared/error' }), BASE, LABEL)
    ).toMatch(/^The 'origin' page showed the error page \(500\)/)
  })

  it('Should refuse a redirect out of the set', () => {
    expect(
      judgeResponse(
        response(302, { location: '/high-risk-plants' }),
        BASE,
        LABEL
      )
    ).toBe(
      "The 'origin' page sent the visitor outside the set, to /high-risk-plants"
    )
  })

  it('Should not mistake a set whose id starts the same for the same set', () => {
    expect(
      judgeResponse(
        response(302, { location: `${BASE}-frozen/notifications` }),
        BASE,
        LABEL
      )
    ).toMatch(/outside the set/)
  })

  it('Should refuse any other status', () => {
    expect(judgeResponse(response(403), BASE, LABEL)).toMatch(/answered 403/)
  })
})

describe('flowPagesOf and pageUrl', () => {
  const sections = [
    { id: 'start', pages: [{ id: 'dashboard', slug: '' }] },
    { id: 'origin', pages: [{ id: 'origin', slug: 'origin' }] }
  ]

  it('Should list every page with its section, in order', () => {
    expect(flowPagesOf(sections)).toEqual([
      { sectionId: 'start', id: 'dashboard', slug: '' },
      { sectionId: 'origin', id: 'origin', slug: 'origin' }
    ])
  })

  it('Should put the dashboard at the set base and other pages under the journey', () => {
    expect(pageUrl(BASE, 'A1', '')).toBe(BASE)
    expect(pageUrl(BASE, 'A1', 'origin')).toBe(
      `${BASE}/notifications/A1/origin`
    )
  })
})
