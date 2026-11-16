import { describe, expect, it } from 'vitest'

import {
  CAPTIONS,
  itemDetailPage,
  itemsPage
} from '../../../../test/fixtures/index.js'
import { AMEND, DRAFT } from '../engine/index.js'
import {
  expectOneLogged,
  expectOneRefusalLogged,
  expectOneSaveFallbackLogged,
  journeyRequest,
  stubH,
  unavailableBackendError
} from '../engine/test-support.js'
import {
  base,
  dateField,
  hubExitTarget,
  logRefusal,
  pageRoutes,
  REFUSAL_LOG_MESSAGE,
  recoverableSave
} from './kit.js'

describe('#base — the section caption the installed journey names', () => {
  it('Should carry the caption of a page the journey captions', () => {
    expect(base('any title', { page: itemDetailPage }).caption).toBe(
      CAPTIONS.itemDetail
    )
  })

  it('Should leave the caption undefined for a page the journey leaves bare', () => {
    expect(base('any title', { page: itemsPage }).caption).toBeUndefined()
  })

  it('Should leave the caption undefined when no page identity is supplied', () => {
    expect(base('any title').caption).toBeUndefined()
  })
})

describe('#dateField — MoJ date-picker view model', () => {
  it('Should carry supplied bounds and value as d/m/yyyy text', () => {
    const field = dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      value: { day: '3', month: '1', year: '2027' },
      minDate: '5/8/2026',
      maxDate: '12/2/2027'
    })

    expect(field.minDate).toBe('5/8/2026')
    expect(field.maxDate).toBe('12/2/2027')
    expect(field.value).toBe('3/1/2027')
  })

  it('Should leave both bounds undefined when none are supplied', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.minDate).toBeUndefined()
    expect(field.maxDate).toBeUndefined()
  })

  it('Should give the form group exactly the house date-picker class when the page passes no classes', () => {
    const field = dateField('exitDate', { label: 'Exit date' })

    expect(field.formGroup).toEqual({ classes: 'app-date-picker' })
  })

  it('Should follow the house date-picker class with the classes the page passes', () => {
    const field = dateField('exitDate', {
      label: 'Exit date',
      formGroupClasses: 'govuk-!-margin-bottom-6'
    })

    expect(field.formGroup).toEqual({
      classes: 'app-date-picker govuk-!-margin-bottom-6'
    })
  })

  it('Should set the label in the size the page asks for, and small when it asks for none', () => {
    const medium = dateField('entryDate', {
      label: 'Entry date',
      labelClasses: 'govuk-label--m'
    })
    const unasked = dateField('otherDate', { label: 'Other date' })

    expect(medium.label.classes).toBe('govuk-label--m')
    expect(unasked.label.classes).toBe('govuk-label--s')
  })
})

describe('#base — journey strip', () => {
  it('Should offer Cancel amend in the strip only for a journey being amended', () => {
    const amending = { journeyId: 'j', status: AMEND }
    expect(base('t', { journey: amending }).journeyStrip.cancelAmend).toEqual({
      href: expect.stringMatching(/\/j\/cancel-amend$/),
      text: 'Cancel amend'
    })
    expect(
      base('t', { journey: { journeyId: 'j', status: DRAFT } }).journeyStrip
        .cancelAmend
    ).toBeUndefined()
  })

  it('Should withhold Cancel amend when the page opts out', () => {
    expect(
      base('t', {
        journey: { journeyId: 'j', status: AMEND },
        offerCancelAmend: false
      }).journeyStrip.cancelAmend
    ).toBeUndefined()
  })

  it('Should leave the status strip off when showJourneyStrip is false and still carry the journey concurrency token', () => {
    const view = base('t', {
      journey: { journeyId: 'j', status: DRAFT, concurrencyToken: 7 },
      showJourneyStrip: false
    })

    expect(view.journeyStrip).toBeNull()
    expect(view.concurrencyToken).toBe(7)
  })
})

describe('#pageRoutes — a save refused as stale', () => {
  const staleSave = () => {
    const error = new Error('stale')
    error.code = 'STALE_CONCURRENCY_TOKEN'
    throw error
  }
  const postRoute = pageRoutes(
    { slug: 'origin' },
    { get: () => null, post: staleSave }
  ).find((route) => route.method === 'POST')

  it('Should log the journey id and posted token, then redirect back to the page with staleAction', async () => {
    const request = journeyRequest('journey-1', {
      payload: { concurrencyToken: '3' },
      path: '/notifications/journey-1/origin',
      url: new URL(
        'http://localhost/notifications/journey-1/origin?from=notification-view'
      )
    })

    const response = await postRoute.handler(request, stubH(request))

    expect(response).toEqual({
      redirect:
        '/notifications/journey-1/origin?from=notification-view&staleAction=1'
    })
    expect(request.logger.entries).toEqual([
      {
        level: 'info',
        fields: { journeyId: 'journey-1', postedConcurrencyToken: '3' },
        message:
          'Save refused: the notification changed since the page was shown'
      }
    ])
  })
})

describe('#recoverableSave', () => {
  const fallbackResponse = { fallback: true }
  const fallback = () => fallbackResponse

  it('Should return the value of a save that succeeds and log nothing', async () => {
    const request = journeyRequest('journey-1')

    const outcome = await recoverableSave(
      request,
      async () => 'saved',
      fallback
    )

    expect(outcome).toEqual({ value: 'saved' })
    expect(request.logger.entries).toEqual([])
  })

  it('Should log one warning with the journey id and the error, then answer with the fallback, when the backend is unavailable', async () => {
    const request = journeyRequest('journey-1')
    const failure = unavailableBackendError('save answers')

    const outcome = await recoverableSave(
      request,
      async () => {
        throw failure
      },
      fallback
    )

    expect(outcome).toEqual({ failure: fallbackResponse })
    expectOneSaveFallbackLogged(request.logger, {
      journeyId: 'journey-1',
      err: failure
    })
  })

  it('Should log the ids the page passes beside the journey id', async () => {
    const request = journeyRequest('journey-1')
    const failure = unavailableBackendError('save answers')

    await recoverableSave(
      request,
      async () => {
        throw failure
      },
      fallback,
      { action: 'remove-line', index: 2 }
    )

    expectOneSaveFallbackLogged(request.logger, {
      journeyId: 'journey-1',
      action: 'remove-line',
      index: 2,
      err: failure
    })
  })

  it('Should rethrow a stale concurrency token without logging it', async () => {
    const request = journeyRequest('journey-1')
    const stale = Object.assign(new Error('stale'), {
      code: 'STALE_CONCURRENCY_TOKEN'
    })

    await expect(
      recoverableSave(
        request,
        async () => {
          throw stale
        },
        fallback
      )
    ).rejects.toBe(stale)
    expect(request.logger.entries).toEqual([])
  })

  it('Should rethrow an error that is not a recoverable backend failure without logging it', async () => {
    const request = journeyRequest('journey-1')
    const bug = new Error('bug')

    await expect(
      recoverableSave(
        request,
        async () => {
          throw bug
        },
        fallback
      )
    ).rejects.toBe(bug)
    expect(request.logger.entries).toEqual([])
  })
})

describe('#logRefusal', () => {
  it('Should log one line with the journey id and the field keys, never the messages', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, {
      fieldErrors: {
        postcode: 'Enter a postcode',
        email: 'Enter an email address'
      }
    })

    expectOneLogged(request.logger, {
      level: 'info',
      fields: { journeyId: 'journey-1', errorCodes: ['postcode', 'email'] },
      message: REFUSAL_LOG_MESSAGE
    })
  })

  it('Should carry the ids the refusal turned on', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, {
      fieldErrors: { party: 'Select one' },
      addressId: 'gone'
    })

    expectOneRefusalLogged(request.logger, {
      journeyId: 'journey-1',
      errorCodes: ['party'],
      addressId: 'gone'
    })
  })

  it('Should log no error codes and the named reason when the page shows no errors', () => {
    const request = journeyRequest('journey-1')

    logRefusal(request, { reason: 'no-line' })

    expectOneRefusalLogged(request.logger, {
      journeyId: 'journey-1',
      errorCodes: [],
      reason: 'no-line'
    })
  })
})

describe('#hubExitTarget — Save and return to overview', () => {
  const params = { journeyId: 'journey-1' }

  it('Should be the overview only for the named hub exit', () => {
    expect(hubExitTarget({ payload: { exit: 'hub' }, params })).toMatch(
      /journey-1$/
    )
    expect(hubExitTarget({ payload: {}, params })).toBeNull()
    expect(hubExitTarget({ params })).toBeNull()
  })
})
