import { describe, expect, it } from 'vitest'

import {
  ExampleStopped,
  canShowErrors,
  errorSummaryOf,
  pathOf,
  send,
  sentDirectlyNote,
  startNotification,
  stuckAfterHubNote
} from './drive.js'

const BASE_URL = 'http://127.0.0.1:3203'

const ERROR_PAGE = `
  <div class="govuk-error-summary">
    <ul class="govuk-error-summary__list">
      <li><a href="#origin">Select the country of origin</a></li>
      <li> </li>
      <li><a href="#date">Enter the date of arrival</a></li>
    </ul>
  </div>`

/** A session whose prototype answers every post with `answer`. */
const sessionAnswering = (answer, posted = []) => ({
  baseUrl: BASE_URL,
  setBase: '/plants-working',
  context: {
    cookies: async () => [{ name: 'crumb', value: 'token-1' }]
  },
  page: {
    request: {
      post: async (url, options) => {
        posted.push({ url, form: options.form })
        return {
          status: () => answer.status,
          headers: () => (answer.location ? { location: answer.location } : {}),
          text: async () => answer.body ?? ''
        }
      }
    }
  }
})

const WHERE = { example: 'Submitted', page: 'origin' }

describe('errorSummaryOf', () => {
  it('Should read every message in the error summary, skipping empty ones', () => {
    expect(errorSummaryOf(ERROR_PAGE)).toEqual([
      'Select the country of origin',
      'Enter the date of arrival'
    ])
  })

  it('Should find nothing on a page with no error summary', () => {
    expect(errorSummaryOf('<h1>Origin</h1>')).toEqual([])
  })
})

describe('pathOf', () => {
  it('Should keep the path and query of an absolute address', () => {
    expect(pathOf(`${BASE_URL}/plants-working?deleted=1`, BASE_URL)).toBe(
      '/plants-working?deleted=1'
    )
  })
})

describe('send', () => {
  it('Should post the answers with the form token and give back where it went', async () => {
    const posted = []
    const session = sessionAnswering(
      {
        status: 302,
        location: `${BASE_URL}/plants-working/notifications/n1/hub`
      },
      posted
    )

    const location = await send(
      session,
      '/plants-working/notifications/n1/origin',
      { countryOfOrigin: 'ES' },
      WHERE
    )

    expect(location).toBe('/plants-working/notifications/n1/hub')
    expect(posted).toEqual([
      {
        url: `${BASE_URL}/plants-working/notifications/n1/origin`,
        form: { countryOfOrigin: 'ES', crumb: 'token-1' }
      }
    ])
  })

  it('Should stop with what the page said when it does not move on', async () => {
    const session = sessionAnswering({ status: 400, body: ERROR_PAGE })

    await expect(send(session, '/x', {}, WHERE)).rejects.toThrow(
      new ExampleStopped(
        'The example "Submitted" stopped at origin: the page said "Select the country of origin; Enter the date of arrival".'
      )
    )
  })

  it('Should stop with the status when the page says nothing', async () => {
    const session = sessionAnswering({ status: 500 })

    await expect(send(session, '/x', {}, WHERE)).rejects.toThrow(
      'the prototype answered 500'
    )
  })
})

describe('startNotification', () => {
  it('Should give the new notification and where it opens', async () => {
    const session = sessionAnswering({
      status: 302,
      location: '/plants-working/notifications/abc123/commodity-type'
    })

    expect(await startNotification(session, 'Submitted')).toEqual({
      journeyId: 'abc123',
      location: '/plants-working/notifications/abc123/commodity-type'
    })
  })

  it('Should stop when starting lands anywhere but a notification', async () => {
    const session = sessionAnswering({
      status: 302,
      location: '/plants-working'
    })

    await expect(startNotification(session, 'Submitted')).rejects.toThrow(
      'The example "Submitted" did not start a notification.'
    )
  })
})

describe('canShowErrors', () => {
  it.each([
    ['origin', true],
    ['origin@warePotatoes', true],
    ['hub', false],
    ['hub@warePotatoes', false],
    ['dashboard', false],
    ['chooser', false],
    ['example:submitted', false]
  ])('Should answer %s with %s', (key, expected) => {
    expect(canShowErrors(key, { landingKey: 'dashboard' })).toBe(expected)
  })
})

describe('the notes a walk writes', () => {
  it('Should say a page was sent directly, quoting the page', () => {
    expect(sentDirectlyNote('origin', ['Select the country'])).toBe(
      'The walkthrough could not fill in origin on screen (the page said "Select the country"), so it sent those answers directly.'
    )
    expect(sentDirectlyNote('origin', [])).toBe(
      'The walkthrough could not fill in origin on screen, so it sent those answers directly.'
    )
  })

  it('Should say where a walk after the task list got stuck', () => {
    expect(stuckAfterHubNote('declaration', ['Tick the box'])).toBe(
      'Could not get past declaration: the page said "Tick the box".'
    )
    expect(stuckAfterHubNote('declaration', [])).toBe(
      'Could not get past declaration.'
    )
  })
})
