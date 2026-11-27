import { describe, expect, it } from 'vitest'

import { CYA_SLUG } from '../app/shared/kit.js'
import { hubPath, pagePath } from '../app/shared/paths.js'
import {
  RUN_ACTIVE,
  RUN_COMPLETE,
  openingRun,
  releaseNextTarget,
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
