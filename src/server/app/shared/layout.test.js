import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { base, SURFACES, surfaceClass } from './kit.js'
import { copy as sharedCopy } from './copy.en.js'
import { SET_BASE } from '../sets/high-risk-plants/set.js'

const environment = nunjucksConfig.options.compileOptions.environment

const PHASE_BANNER = 'govuk-phase-banner'
const BREADCRUMBS = 'govuk-breadcrumbs'
const ADDRESS_BOOK_URL = 'http://ins.test/address-book'

const renderLayout = (userSession, context = {}) =>
  environment.render('shared/layout.njk', {
    pageTitle: 'Create an import notification',
    sharedCopy,
    userSession,
    addressBookUrl: ADDRESS_BOOK_URL,
    homeUrl: SET_BASE,
    getAssetPath: (asset) => `/assets/${asset}`,
    ...context
  })

const parse = (html) => new JSDOM(html).window.document

const textOf = (elements) =>
  [...elements].map((element) => element.textContent).join('')

const NAVIGATION_LIST = 'govuk-service-navigation__list'
const ACTIVE_ITEM = 'govuk-service-navigation__item--active'
const { serviceNavigation } = sharedCopy.layout

describe('service navigation', () => {
  const signedIn = {
    isAuthenticated: true,
    displayName: 'Sam Example',
    email: 'sam@example.test'
  }

  it('Should offer dashboard, address book, manage account and log out on a signed-in page', () => {
    const document = parse(renderLayout(signedIn))
    const items = document.querySelectorAll('.govuk-service-navigation__item')
    const links = [
      ...document.querySelectorAll('.govuk-service-navigation__item a')
    ]

    expect(items).toHaveLength(4)
    expect(links.map((a) => a.textContent.trim())).toEqual([
      serviceNavigation.dashboard,
      serviceNavigation.addressBook,
      serviceNavigation.manageAccount,
      serviceNavigation.logOut
    ])
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      SET_BASE,
      ADDRESS_BOOK_URL,
      '#',
      '/auth/sign-out'
    ])
  })

  it('Should point the dashboard link and the service name at the set’s own base', () => {
    const document = parse(renderLayout(signedIn))

    expect(
      document.querySelectorAll(
        `.govuk-service-navigation__item a[href="${SET_BASE}"]`
      )
    ).toHaveLength(1)
    expect(
      document
        .querySelector('.govuk-service-navigation__service-name a')
        .getAttribute('href')
    ).toBe(SET_BASE)
  })

  it('Should mark the dashboard item active inside the notifications section', () => {
    const document = parse(
      renderLayout(signedIn, { activeNavigationItem: 'dashboard' })
    )

    expect(
      document.querySelectorAll('.govuk-service-navigation__item--active')
    ).toHaveLength(1)
    expect(document.querySelectorAll('[aria-current="true"]')).toHaveLength(1)
    expect(
      textOf(
        document.querySelectorAll('.govuk-service-navigation__active-fallback')
      )
    ).toBe(serviceNavigation.dashboard)
  })

  it('Should mark nothing active outside any navigation section', () => {
    const html = renderLayout(signedIn, { activeNavigationItem: null })

    expect(html).toContain(NAVIGATION_LIST)
    expect(html).not.toContain(ACTIVE_ITEM)
    expect(html).not.toContain('aria-current')
  })

  it('Should not show the signed-in user’s name, email or user header', () => {
    const html = renderLayout(signedIn)

    expect(html).not.toContain('Sam Example')
    expect(html).not.toContain('sam@example.test')
    expect(html).not.toContain('app-service-header')
  })

  it('Should carry the service name and no items when there is no user', () => {
    const html = renderLayout({ isAuthenticated: false })

    expect(html).toContain(sharedCopy.layout.serviceName)
    expect(html).not.toContain('Prototype')
    expect(html).not.toContain('non-functional prototype')
    expect(html).not.toContain(NAVIGATION_LIST)
    expect(html).not.toContain('href="/auth/sign-out"')
    expect(html).not.toContain(serviceNavigation.logOut)
  })
})

describe('alpha phase banner', () => {
  const feedbackAnchor =
    '<a class="govuk-link" href="mailto:APHAServiceDesk@apha.gov.uk">give your feedback by email</a>'

  it('Should tag the service as alpha in grey and offer the feedback link', () => {
    const html = renderLayout({ isAuthenticated: true })

    expect(html).toContain(PHASE_BANNER)
    expect(html).toContain('govuk-tag--grey')
    expect(html).toContain('Alpha')
    expect(html).toContain(
      `This is a new service. Help us improve it and ${feedbackAnchor}.`
    )
  })

  it('Should render the banner on a signed-out page too', () => {
    const html = renderLayout({ isAuthenticated: false })

    expect(html).toContain(PHASE_BANNER)
  })

  it('Should place the banner above the back link', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { backLink: '/notifications' }
    )

    expect(html.indexOf(PHASE_BANNER)).toBeLessThan(
      html.indexOf('govuk-back-link')
    )
  })
})

describe('journey strip', () => {
  const status = { text: 'Amend', classes: 'govuk-tag--yellow' }
  const cancelAmend = { href: '/x/cancel-amend', text: 'Cancel amend' }

  it('Should show Cancel amend as a link beside the tag and reference while amending', () => {
    const document = parse(
      renderLayout(
        { isAuthenticated: true },
        { journeyStrip: { reference: 'R', status, cancelAmend } }
      )
    )
    const links = document.querySelectorAll('.app-journey-strip a.govuk-link')

    expect(
      textOf(document.querySelectorAll('.app-journey-strip .govuk-tag')).trim()
    ).toBe('Amend')
    expect(textOf(document.querySelectorAll('.app-journey-strip'))).toContain(
      'R'
    )
    expect(links).toHaveLength(1)
    expect(links[0].textContent).toBe('Cancel amend')
    expect(links[0].getAttribute('href')).toBe('/x/cancel-amend')
  })

  it('Should show no link in the strip without a Cancel amend control', () => {
    const document = parse(
      renderLayout(
        { isAuthenticated: true },
        {
          journeyStrip: {
            reference: 'R',
            status: { text: 'Draft', classes: 'govuk-tag--blue' }
          }
        }
      )
    )

    expect(document.querySelectorAll('.app-journey-strip')).toHaveLength(1)
    expect(document.querySelectorAll('.app-journey-strip a')).toHaveLength(0)
  })
})

describe('breadcrumbs', () => {
  it('Should render no breadcrumb trail', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { backLink: '/notifications' }
    )

    expect(html).not.toContain(BREADCRUMBS)
  })

  it('Should ignore a breadcrumbs value a caller still passes', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { breadcrumbs: [{ text: 'Your notifications', href: '/' }] }
    )

    expect(html).not.toContain(BREADCRUMBS)
    expect(html).not.toContain('Your notifications')
  })
})

describe('content column width by surface', () => {
  it('Should render a display surface at full container width', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      { contentColumnClass: SURFACES.display }
    )

    expect(html).toContain(SURFACES.display)
    expect(html).not.toContain(SURFACES.form)
  })

  it('Should fall back to the reading measure when no surface is declared', () => {
    const html = renderLayout({ isAuthenticated: true })

    expect(html).toContain(SURFACES.form)
    expect(html).not.toContain('class=""')
  })
})

describe('kit surfaces', () => {
  it('Should build answering-page chrome at the reading measure', () => {
    expect(base('Any page').contentColumnClass).toBe(SURFACES.form)
  })

  it('Should give display pages the full container', () => {
    expect(surfaceClass('display')).toBe(SURFACES.display)
  })

  it('Should reject an unknown surface rather than render nothing', () => {
    expect(() => surfaceClass('widescreen')).toThrow(
      /Unknown surface 'widescreen'/
    )
  })

  it('Should reject an inherited Object property as a surface name', () => {
    expect(() => surfaceClass('constructor')).toThrow(
      /Unknown surface 'constructor'/
    )
  })
})

describe('page title', () => {
  const titleOf = (html) => parse(html).querySelector('head title').textContent
  const { serviceName, govukSuffix, errorTitlePrefix } = sharedCopy.layout

  it('Should join the page name, the service name and GOV.UK with hyphens', () => {
    expect(titleOf(renderLayout({ isAuthenticated: true }))).toBe(
      `Create an import notification - ${serviceName} - ${govukSuffix}`
    )
  })

  it('Should keep the error prefix in front of the whole title', () => {
    const html = renderLayout(
      { isAuthenticated: true },
      {
        errorSummary: [
          { text: 'Select what you are importing', href: '#commodityType' }
        ]
      }
    )

    expect(titleOf(html)).toBe(
      `${errorTitlePrefix}Create an import notification - ${serviceName} - ${govukSuffix}`
    )
  })
})
