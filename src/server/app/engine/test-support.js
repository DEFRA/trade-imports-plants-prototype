import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { config } from '../../../config/config.js'
import { buildDispatch } from '../flow/dispatch.js'
import { isCopyLeaf, leaves } from '../shared/copy-leaves.js'
import {
  REFUSAL_LOG_MESSAGE,
  SAVE_FALLBACK_LOG_MESSAGE
} from '../shared/kit.js'
import { store } from './store.js'
import { knownJourneysCookie } from './journey.js'
import { configureRecords, records } from './persistence/records.js'
import { configureSession, openingRunCookie } from './persistence/session.js'
import { BackendRequestError } from '../services/persistence/records/errors.js'
import { records as recordsReal } from '../services/persistence/records/real/index.js'
import { records as recordsStub } from '../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../services/persistence/session/stub.js'
import { currentSetId } from '../shared/set-context.js'
import { pagePath } from '../shared/paths.js'

export const authenticatedCredentials = Object.freeze({
  contactId: 2100010101,
  name: 'Andrew Farmer',
  currentRelationshipId: '5900001',
  organisationId: '5900001'
})

export const authenticatedActor = Object.freeze({
  id: '2100010101',
  source: 'dynamics-contact',
  userType: 'B2C',
  displayName: 'Andrew Farmer',
  organisationId: '5900001'
})

export const registerTestRequestLogger = (server) => {
  server.decorate('request', 'logger', () => recordingLogger(), { apply: true })
}

export const registerTestSessionAuth = (server) => {
  server.auth.scheme('test-session', () => ({
    authenticate: (_request, h) =>
      h.authenticated({ credentials: authenticatedCredentials })
  }))
  server.auth.strategy('session', 'test-session')
}

const stubResponse = (payload) => ({
  payload,
  code: (statusCode) => ({ payload, statusCode })
})

const stubView = (captured) => (view, context) => {
  const rendered = {
    view,
    context,
    statusCode: 200,
    code(statusCode) {
      this.statusCode = statusCode
      return this
    }
  }
  captured.view = rendered
  return rendered
}

const cookieRecorder = () => {
  const cookies = {}
  const calls = []
  return {
    cookies,
    calls,
    state: (name, value) => {
      calls.push([name, value])
      cookies[name] = value
    },
    unstate: (name) => {
      delete cookies[name]
    }
  }
}

const stateWrittenToRequest = (request) => ({
  state: (name, value) => {
    request.state[name] = value
  }
})

/** A response toolkit that records what the handler rendered, with `request` as `h.request`.
 * With `writesStateToRequest`, `state()` writes the cookie onto `request.state`, so a
 * read later in the same request sees it. */
export const stubH = (request, { writesStateToRequest = false } = {}) => {
  const captured = {}
  return {
    ...cookieRecorder(),
    ...(writesStateToRequest && stateWrittenToRequest(request)),
    request,
    view: stubView(captured),
    redirect: (to) => ({ redirect: to }),
    response: stubResponse,
    captured
  }
}

/** A request logger that keeps every line it is given in `entries`. */
export const recordingLogger = () => {
  const entries = []
  const recordAt = (level) => (fields, message) =>
    entries.push({ level, fields, message })
  return {
    entries,
    debug: recordAt('debug'),
    info: recordAt('info'),
    warn: recordAt('warn'),
    error: recordAt('error')
  }
}

/** Asserts the logger holds exactly one line. */
export const expectOneLogged = (logger, { level, fields, message }) =>
  expect(logger.entries).toEqual([{ level, fields, message }])

const refusalEntry = ({ journeyId, errorCodes, ...details }) => ({
  level: 'info',
  message: REFUSAL_LOG_MESSAGE,
  fields: expect.objectContaining({ journeyId, errorCodes, ...details })
})

export const expectNoRefusalLogged = (logger) =>
  expect(
    logger.entries.filter(({ message }) => message === REFUSAL_LOG_MESSAGE)
  ).toEqual([])

export const expectOneRefusalLogged = (logger, refusal) =>
  expectOneLogged(logger, refusalEntry(refusal))

/** The log entry for a save fallback: the journey id, the caught error and
 * any ids the page passed. */
export const saveFallbackEntry = ({ journeyId, err, ...ids }) => ({
  level: 'warn',
  message: SAVE_FALLBACK_LOG_MESSAGE,
  fields: expect.objectContaining({ journeyId, ...ids, err })
})

export const expectOneSaveFallbackLogged = (logger, fallback) =>
  expectOneLogged(logger, saveFallbackEntry(fallback))

/** The recoverable records error for a backend that answered 503 to `operation`. */
export const unavailableBackendError = (operation) =>
  new BackendRequestError(operation, {
    status: 503,
    statusText: 'Service Unavailable'
  })

export const journeyRequest = (
  journeyId,
  { knownJourneyIds, ...overrides } = {}
) => ({
  app: {},
  payload: {},
  query: {},
  headers: {},
  logger: recordingLogger(),
  auth: {
    isAuthenticated: true,
    credentials: authenticatedCredentials
  },
  ...overrides,
  params: { journeyId, ...overrides.params },
  state: {
    [knownJourneysCookie()]: knownJourneyIds ?? (journeyId ? [journeyId] : []),
    ...overrides.state
  }
})

export const recordingH = () => cookieRecorder()

/** Runs a GET and a POST handler as a session that holds no journey, each on
 * its own request with `state()` writing onto `request.state`, and returns the
 * requests and the responses. */
export const requestAsSessionHoldingNoJourney = async (
  journeyId,
  { get, post }
) => {
  const requestHoldingNoJourney = () =>
    journeyRequest(journeyId, { state: { [knownJourneysCookie()]: [] } })
  const getRequest = requestHoldingNoJourney()
  const postRequest = requestHoldingNoJourney()
  const writesStateToRequest = true
  return {
    getRequest,
    postRequest,
    getResponse: await get(
      getRequest,
      stubH(getRequest, { writesStateToRequest })
    ),
    postResponse: await post(
      postRequest,
      stubH(postRequest, { writesStateToRequest })
    )
  }
}

export const backendJourneyId = 'REFERENCE-0001'

export const backendNotification = ({
  status = 'DRAFT',
  fulfilments = [],
  concurrencyToken = 0,
  submittedAt = null
} = {}) =>
  JSON.stringify({
    referenceNumber: backendJourneyId,
    fulfilments,
    status,
    created: '2026-07-23T09:00:00',
    submittedAt,
    concurrencyToken
  })

const recordsRejectingSaves = (failure) => ({
  ...recordsStub,
  replaceFulfilment: async () => {
    throw failure
  }
})

const requestLocation = (pathOf, journeyId, query) => {
  if (!pathOf) {
    return {}
  }
  const path = pathOf(journeyId)
  const url = new URL(path, 'http://localhost')
  Object.entries(query).forEach(([name, value]) =>
    url.searchParams.set(name, value)
  )
  return { path, url }
}

/** Seeds a journey, runs one handler against it and reports the answers before
 * and after. `amend` submits the journey and opens an amendment first;
 * `openingRun` (`RUN_ACTIVE` or `RUN_COMPLETE`) records that phase of the
 * opening run for the journey; `pathOf(journeyId)` gives the request the path
 * it was made to; `saveFailure` makes the records store refuse every save the
 * handler makes with that error. */
export const driveHandler = async (
  handler,
  {
    payload = {},
    seed = {},
    params = {},
    query = {},
    amend = false,
    openingRun,
    saveFailure,
    pathOf
  } = {}
) => {
  const journey = await store.create()
  await store.seedAnswers(journey.journeyId, seed)
  if (amend) {
    await store.submit(journey.journeyId)
    await records.amend(journey.journeyId)
  }
  const request = journeyRequest(journey.journeyId, {
    payload,
    params,
    query,
    state: openingRun
      ? { [openingRunCookie()]: { [journey.journeyId]: openingRun } }
      : {},
    ...requestLocation(pathOf, journey.journeyId, query)
  })
  const h = stubH(request)
  if (saveFailure) {
    configureRecords(currentSetId(), recordsRejectingSaves(saveFailure))
  }
  let response
  try {
    response = await handler(request, h)
  } finally {
    configureRecords(currentSetId(), recordsStub)
  }
  const after = (await store.get(journey.journeyId)).answers
  return {
    journeyId: journey.journeyId,
    before: seed,
    after,
    response,
    view: h.captured.view,
    logger: request.logger
  }
}

export const postHandlerOf = (featureModule) =>
  featureModule.routes.find((route) => route.method === 'POST').handler

export const postHandlerEndingWith = (featureModule, pathSuffix) =>
  featureModule.routes.find(
    (route) => route.method === 'POST' && route.path.endsWith(pathSuffix)
  ).handler

export const fetchMock = createFetchMock(vi)

export const resetMocksAndConfigAfterTests = (...configKeys) => {
  const originals = ['stubMode', ...configKeys].map((key) => [
    key,
    config.get(key)
  ])
  afterEach(() => {
    fetchMock.resetMocks()
    vi.unstubAllGlobals()
    originals.forEach(([key, value]) => config.set(key, value))
  })
}

export const useReferenceDataServing = () => {
  resetMocksAndConfigAfterTests()
  return (rows) => {
    config.set('stubMode', false)
    fetchMock.enableMocks()
    fetchMock.mockResponse(async () => ({ body: JSON.stringify(rows) }))
  }
}

/** Puts the address book on the network boundary: every request to its
 * `/addresses` paths gets `addressResponse` (or, for a function, what it
 * returns for the request) and the country list gets the United Kingdom,
 * Switzerland and the United States. Call it inside a test; pair it with
 * `resetMocksAndConfigAfterTests()` in the describe. */
export const addressBookAnswering = (addressResponse) => {
  const countryList = JSON.stringify([
    { code: 'GB', name: 'United Kingdom' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'US', name: 'United States' }
  ])
  const answerAddresses = (request) =>
    typeof addressResponse === 'function'
      ? addressResponse(request)
      : addressResponse
  fetchMock.enableMocks()
  config.set('stubMode', false)
  fetchMock.mockResponse(async (request) =>
    request.url.includes('/addresses')
      ? answerAddresses(request)
      : { body: countryList }
  )
}

export const addressBookRefusingAddresses = () =>
  addressBookAnswering({ status: 500 })

/** The urls of the address book requests made since `addressBookAnswering()`. */
export const addressBookRequestUrls = () =>
  fetchMock
    .requests()
    .map((request) => request.url)
    .filter((url) => url.includes('/addresses'))

export const useStubbedJourney = (setId, dispatchPages) => {
  beforeAll(() => {
    configureSession(setId, sessionStub)
    buildDispatch(setId, dispatchPages)
  })
  beforeEach(async () => {
    configureRecords(setId, recordsStub)
    await store.clear()
  })
}

export const useBackendRecords = (setId) => {
  beforeAll(() => {
    configureRecords(setId, recordsReal)
    configureSession(setId, sessionStub)
  })
  beforeEach(() => {
    fetchMock.enableMocks()
    fetchMock.mockClear()
  })
  resetMocksAndConfigAfterTests()
}

export const expectBackLinkIsPath = (result, path) =>
  expect(result.view.context.backLink).toBe(path)

export const expectBackLinkIsPage = (result, slug) =>
  expectBackLinkIsPath(result, pagePath(result.journeyId, slug))

export const expectEveryLeafToBeCopy = (locale, bundle) => {
  for (const { path, value } of leaves(bundle)) {
    expect(isCopyLeaf(value), `${locale}: ${path} must be copy`).toBe(true)
  }
}

export const itHoldsCopyAtEveryLeaf = (en, cy) =>
  it.each([
    ['en', en],
    ['cy', cy]
  ])(
    'Should hold a non-empty string or copy function at every %s leaf',
    expectEveryLeafToBeCopy
  )
