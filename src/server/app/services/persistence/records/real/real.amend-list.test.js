import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { config } from '../../../../../../config/config.js'
import { records } from './index.js'

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

const notificationsUrl = 'http://localhost:8091/notifications'

const RECORD_CREATED_AT = '2026-07-14T09:00:00'
const RECORD_SUBMITTED_AT = '2026-07-14T10:00:00'
const RECORD_ARRIVAL_DATE = '2026-07-20'
const CONSIGNOR_NAME = 'Consignor Ltd'
const CONSIGNEE_NAME = 'Consignee Ltd'

// The backend stamps submittedAt on first submission and leaves it in place
// through an amendment, so an AMEND row arrives carrying one. Only the list
// marshal's status gate keeps it off an amending card.
const submittedAtFor = (status) =>
  status === 'DRAFT' ? null : RECORD_SUBMITTED_AT

const notification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  concurrencyToken: 0,
  created: RECORD_CREATED_AT,
  submittedAt: submittedAtFor(status),
  updated: RECORD_CREATED_AT,
  commodity: { name: 'item-one' },
  origin: { countryCode: 'FR' },
  transport: { arrivalDate: RECORD_ARRIVAL_DATE },
  consignor: { name: CONSIGNOR_NAME },
  consignee: { name: CONSIGNEE_NAME }
})

const mockNotification = (referenceNumber, status) => ({
  referenceNumber,
  status,
  created: RECORD_CREATED_AT,
  submittedAt: submittedAtFor(status),
  fulfilments: []
})

describe('real records adapter — amend', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should POST the amend endpoint and marshal a writable amend record', async () => {
    fetchMocker.mockResponse(JSON.stringify(mockNotification('REF-1', 'AMEND')))

    const amended = await records.amend('REF-1')

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}/REF-1/amend`)
    expect(request.method).toBe('POST')
    expect(amended.status).toBe(AMEND)
    expect(amended.submittedAt).toBeNull()
    expect(amended.createdAt).toBe(RECORD_CREATED_AT)
  })

  test('Should surface a failed amend as an error carrying the response status', async () => {
    fetchMocker.mockResponse('Conflict', { status: 409 })

    await expect(records.amend('REF-1')).rejects.toThrow(
      /Failed to amend notification: 409/
    )
  })
})

describe('real records adapter — paged list', () => {
  beforeEach(() => {
    fetchMocker.resetMocks()
  })

  test('Should GET /notifications and map main-shape entries to dashboard rows', async () => {
    fetchMocker.mockResponse(
      JSON.stringify({
        page: 1,
        size: 20,
        totalElements: 3,
        totalPages: 1,
        content: [
          notification('REF-1', 'DRAFT'),
          notification('REF-2', 'SUBMITTED'),
          notification('REF-3', 'AMEND')
        ]
      })
    )

    const listed = await records.list({
      journeyIds: ['session-id-is-ignored-in-real-mode'],
      page: 2,
      sort: 'createdAt,asc'
    })

    const [request] = fetchMocker.requests()
    expect(request.url).toBe(`${notificationsUrl}?page=2&sort=createdAt,asc`)
    expect(request.method).toBe('GET')
    expect(listed).toEqual({
      page: 1,
      size: 20,
      totalElements: 3,
      totalPages: 1,
      rows: [
        {
          journeyId: 'REF-1',
          status: DRAFT,
          createdAt: RECORD_CREATED_AT,
          submittedAt: null,
          concurrencyToken: 0,
          reference: 'REF-1',
          commodity: { name: 'item-one' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        },
        {
          journeyId: 'REF-2',
          status: SUBMITTED,
          createdAt: RECORD_CREATED_AT,
          submittedAt: RECORD_SUBMITTED_AT,
          concurrencyToken: 0,
          reference: 'REF-2',
          commodity: { name: 'item-one' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        },
        {
          journeyId: 'REF-3',
          status: AMEND,
          createdAt: RECORD_CREATED_AT,
          submittedAt: null,
          concurrencyToken: 0,
          reference: 'REF-3',
          commodity: { name: 'item-one' },
          originCountryCode: 'FR',
          arrivalDate: RECORD_ARRIVAL_DATE,
          consignorName: CONSIGNOR_NAME,
          consigneeName: CONSIGNEE_NAME
        }
      ]
    })
  })

  test('Should implement has with an exact-id canonical GET', async () => {
    fetchMocker.mockResponses(
      [JSON.stringify(mockNotification('REF-1', 'DRAFT')), { status: 200 }],
      ['Not Found', { status: 404 }]
    )

    expect(await records.has('REF-1')).toBe(true)
    expect(await records.has('REF-GONE')).toBe(false)
    const requests = fetchMocker.requests()
    expect(requests.map(({ method, url }) => ({ method, url }))).toEqual([
      { method: 'GET', url: `${notificationsUrl}/REF-1/fulfilments` },
      { method: 'GET', url: `${notificationsUrl}/REF-GONE/fulfilments` }
    ])
  })
})

// The unit suite runs in stub mode; the address book only answers in real mode,
// so this turns the switch off to prove the list never asks it.
describe('real records adapter — party names', () => {
  const originalMode = config.get('stubMode')

  beforeEach(() => {
    fetchMocker.resetMocks()
    config.set('stubMode', false)
  })

  afterEach(() => {
    config.set('stubMode', originalMode)
  })

  test.each(['DRAFT', 'SUBMITTED', 'AMEND'])(
    'Should read the copied party name off a %s notification without reading the address book',
    async (status) => {
      fetchMocker.mockResponse(
        JSON.stringify({
          page: 1,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          content: [notification('REF-1', status)]
        })
      )

      const listed = await records.list({ page: 1 })

      expect(listed.rows[0].consignorName).toBe(CONSIGNOR_NAME)
      expect(
        fetchMocker
          .requests()
          .map(({ url }) => url)
          .filter((url) => !url.startsWith(notificationsUrl))
      ).toEqual([])
    }
  )
})
