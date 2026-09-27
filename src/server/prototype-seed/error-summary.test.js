import { describe, expect, it } from 'vitest'

import {
  errorSummaryMessages,
  mainHeading,
  whatThePageSaid
} from './error-summary.js'

const SUMMARY = `
<div class="govuk-error-summary" data-module="govuk-error-summary">
  <div role="alert">
    <h2 class="govuk-error-summary__title">There is a problem</h2>
    <div class="govuk-error-summary__body">
      <ul class="govuk-list govuk-error-summary__list">
        <li>
          <a href="#arrivalDate">Enter the date the consignment will arrive</a>
        </li>
        <li>
          <a href="#proposedPlaceOfLanding">Select the port &amp; point of entry you&#39;ll use</a>
        </li>
      </ul>
    </div>
  </div>
</div>
<h1 class="govuk-heading-l">Arrival details</h1>`

describe('reading what a refused page said', () => {
  it('Should read every message in the GOV.UK error summary, in order', () => {
    expect(errorSummaryMessages(SUMMARY)).toEqual([
      'Enter the date the consignment will arrive',
      "Select the port & point of entry you'll use"
    ])
  })

  it('Should join the messages into one line', () => {
    expect(whatThePageSaid({ statusCode: 400, payload: SUMMARY })).toBe(
      "Enter the date the consignment will arrive; Select the port & point of entry you'll use"
    )
  })

  it('Should fall back to the heading when the page has no error summary', () => {
    const page =
      '<main><h1 class="govuk-heading-l">Sorry, there is a problem with the service</h1></main>'

    expect(mainHeading(page)).toBe('Sorry, there is a problem with the service')
    expect(whatThePageSaid({ statusCode: 500, payload: page })).toBe(
      'Sorry, there is a problem with the service (500)'
    )
  })

  it('Should fall back to the status code when the page says nothing', () => {
    expect(whatThePageSaid({ statusCode: 403, payload: '' })).toBe(
      'nothing, it answered 403'
    )
    expect(errorSummaryMessages(undefined)).toEqual([])
  })
})
