import { beforeAll, describe, expect, it } from 'vitest'

import {
  BRANCH_A,
  BRANCH_D,
  SELECTOR_ALPHA,
  dispatchPages
} from '../../../test/fixtures/index.js'
import { evaluateAnswers } from '../app/bridge/evaluation.js'
import { makeScope } from '../app/engine/index.js'
import { get as engineGet, memoRequestView } from '../app/engine/read.js'
import { authenticatedCredentials } from '../app/engine/test-support.js'
import { buildDispatch } from '../app/flow/dispatch.js'
import { SET_ID } from '../app/sets/high-risk-plants/set.js'
import { withoutUnresolvedPartyRefs } from '../app/sets/plants-working/journeys/linear/parties/index.js'
import { CYA_SLUG } from '../app/shared/kit.js'
import { hubPath, pagePath } from '../app/shared/paths.js'
import {
  RUN_ACTIVE,
  RUN_COMPLETE,
  nextInSection,
  openingRun,
  releaseNextTarget,
  sanitisedGet,
  withChangeContext
} from './release-journey.js'

const COOKIE = 'openingRun'
const JOURNEY_ID = 'journey-1'
const RUN_STEP = '/run-step'

const cookieJar = () => {
  const jar = {}
  return {
    request: () => ({ state: { ...jar } }),
    h: { state: (name, value) => Object.assign(jar, { [name]: value }) },
    jar
  }
}

const saveRequest = ({ query = {}, payload = {} } = {}) => ({
  params: { journeyId: JOURNEY_ID },
  query,
  payload
})

const nextTarget = (inRun) =>
  releaseNextTarget({
    inOpeningRun: async () => inRun,
    nextRunTarget: () => RUN_STEP
  })

describe('openingRun', () => {
  it('Should keep each journey’s phase in the release’s own cookie', async () => {
    const cookies = cookieJar()
    const run = openingRun(COOKIE)
    expect(await run.openingRunStarted(cookies.request(), JOURNEY_ID)).toBe(
      false
    )

    await run.beginOpeningRun(cookies.request(), cookies.h, JOURNEY_ID)
    expect(cookies.jar[COOKIE]).toEqual({ [JOURNEY_ID]: RUN_ACTIVE })
    expect(await run.inOpeningRun(cookies.request(), JOURNEY_ID)).toBe(true)

    await run.completeOpeningRun(cookies.request(), cookies.h, JOURNEY_ID)
    expect(cookies.jar[COOKIE]).toEqual({ [JOURNEY_ID]: RUN_COMPLETE })
    expect(await run.inOpeningRun(cookies.request(), JOURNEY_ID)).toBe(false)
    expect(await run.openingRunStarted(cookies.request(), JOURNEY_ID)).toBe(
      true
    )
  })

  it('Should not complete a run that was never begun', async () => {
    const cookies = cookieJar()
    await openingRun(COOKIE).completeOpeningRun(
      cookies.request(),
      cookies.h,
      JOURNEY_ID
    )
    expect(cookies.jar[COOKIE]).toBeUndefined()
  })
})

describe('withChangeContext', () => {
  it('Should carry ?change=1 only in a change context', () => {
    expect(withChangeContext({ query: { change: '1' } }, '/origin')).toBe(
      '/origin?change=1'
    )
    expect(withChangeContext({ query: {} }, '/origin')).toBe('/origin')
  })
})

describe('releaseNextTarget', () => {
  const page = { id: 'origin' }

  it('Should go to the overview for Save and return to overview, before anything else', async () => {
    const request = saveRequest({
      query: { change: '1' },
      payload: { exit: 'hub' }
    })
    expect(await nextTarget(true)(request, page, {})).toBe(hubPath(JOURNEY_ID))
  })

  it('Should go back to Check your answers in a change context, before the run', async () => {
    const request = saveRequest({ query: { change: '1' } })
    expect(await nextTarget(true)(request, page, {})).toBe(
      pagePath(JOURNEY_ID, CYA_SLUG)
    )
  })

  it('Should go to the next run step during the opening run', async () => {
    expect(await nextTarget(true)(saveRequest(), page, {})).toBe(RUN_STEP)
  })
})

describe('nextInSection', () => {
  beforeAll(() => {
    buildDispatch(SET_ID, dispatchPages)
  })

  const scopeOnBranch = (branchSelector) =>
    makeScope({
      scalarField: 'answered',
      itemCollection: [{ itemSelector: SELECTOR_ALPHA }],
      branchSelector
    })

  it('Should go to the next page in the section that applies, past the ones that do not', () => {
    expect(
      nextInSection('branchPage', scopeOnBranch(BRANCH_A), JOURNEY_ID)
    ).toBe(pagePath(JOURNEY_ID, 'details'))
  })

  it('Should go to the next page in the section when it applies', () => {
    expect(
      nextInSection('branchBDPage', scopeOnBranch(BRANCH_D), JOURNEY_ID)
    ).toBe(pagePath(JOURNEY_ID, 'branch-d'))
  })

  it('Should go to the overview after the last page in the section', () => {
    const scope = scopeOnBranch(BRANCH_A)
    expect(nextInSection('detailsPage', scope, JOURNEY_ID)).toBe(
      hubPath(JOURNEY_ID)
    )
  })

  it('Should go to the overview for a page in no section', () => {
    expect(nextInSection('noSuchPage', makeScope({}), JOURNEY_ID)).toBe(
      hubPath(JOURNEY_ID)
    )
  })
})

describe('sanitisedGet', () => {
  const get = sanitisedGet(withoutUnresolvedPartyRefs)

  const readRequestFor = (answers) => {
    const request = { app: {}, auth: { credentials: authenticatedCredentials } }
    const view = {
      answers,
      evaluation: evaluateAnswers(answers),
      scope: makeScope(answers)
    }
    memoRequestView(request, view)
    return { request, view }
  }

  it('Should drop an address-book reference the book does not hold, keeping what was saved', async () => {
    const stored = { placeOfDestination: { addressId: 'no-such-address' } }
    const { request, view } = readRequestFor(stored)

    const sanitised = await get(request)

    expect(sanitised.answers).toEqual({})
    expect(sanitised.storedAnswers).toBe(stored)
    expect(sanitised.evaluation).not.toBe(view.evaluation)
    expect(sanitised.evaluation).toEqual(evaluateAnswers({}))
    expect(await engineGet(request)).toBe(sanitised)
  })

  it('Should keep the answers, as the same object, when every reference resolves', async () => {
    const stored = { placeOfDestination: { addressId: 'tech-imports-ltd' } }
    const { request, view } = readRequestFor(stored)

    const read = await get(request)

    expect(read.answers).toBe(stored)
    expect(read.storedAnswers).toBe(stored)
    expect(read.evaluation).toBe(view.evaluation)
    expect(await engineGet(request)).toBe(read)
  })

  it('Should return a view it has already sanitised as it is', async () => {
    const { request } = readRequestFor({
      placeOfDestination: { addressId: 'no-such-address' }
    })
    const sanitised = await get(request)

    expect(await get(request)).toBe(sanitised)
  })
})
