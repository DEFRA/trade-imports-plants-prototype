import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'

import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'
import { copy as sharedCopy } from '../shared/copy.en.js'

const environment = nunjucksConfig.options.compileOptions.environment

const renderUnauthorised = () =>
  new JSDOM(
    environment.render('auth/unauthorised.njk', {
      pageTitle: sharedCopy.unauthorised.title,
      sharedCopy,
      getAssetPath: (asset) => `/assets/${asset}`
    })
  ).window.document

const { unauthorised } = sharedCopy

describe('unauthorised page', () => {
  it('Should take its heading from the copy module', () => {
    const document = renderUnauthorised()

    expect(
      document.querySelector('h1.govuk-heading-l').textContent.trim()
    ).toBe(unauthorised.heading)
  })

  it('Should take its body and link text from the copy module', () => {
    const paragraph = renderUnauthorised().querySelector('main p.govuk-body')

    expect(paragraph.textContent.trim()).toBe(
      `${unauthorised.bodyPrefix} ${unauthorised.signInLinkText}.`
    )
    expect(paragraph.querySelector('a.govuk-link').textContent.trim()).toBe(
      unauthorised.signInLinkText
    )
  })

  it('Should send the retry link to the sign-in route', () => {
    const document = renderUnauthorised()

    expect(
      document
        .querySelector('main p.govuk-body a.govuk-link')
        .getAttribute('href')
    ).toBe('/auth/sign-in')
  })
})
