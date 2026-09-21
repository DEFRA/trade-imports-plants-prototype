import { describe, expect, it } from 'vitest'

import { DRAFT, SUBMITTED } from '../../../../../../../../engine/index.js'
import { toRow } from './index.js'

const marshalledRow = {
  journeyId: '26-ABC123',
  reference: '26-ABC123',
  status: SUBMITTED,
  commodity: { name: 'Potatoes' },
  originCountryCode: 'FR',
  arrivalDate: '2026-03-05',
  consignorName: 'Acme Ltd',
  createdAt: '2026-03-01T09:00:00.000Z',
  submittedAt: '2026-03-02T09:00:00.000Z'
}

describe('#toRow', () => {
  it('Should map every display cell the card renders', async () => {
    expect(await toRow(marshalledRow)).toMatchObject({
      reference: '26-ABC123',
      commodity: 'Potatoes',
      origin: 'France',
      arrival: '5 Mar 2026',
      consignor: 'Acme Ltd',
      created: '1 Mar 2026',
      submitted: '2 Mar 2026'
    })
  })

  it('Should fall back to the raw code for an origin the country list does not name', async () => {
    expect(
      (await toRow({ ...marshalledRow, originCountryCode: 'ZZ' })).origin
    ).toBe('ZZ')
  })

  it('Should leave an absent origin, consignor or arrival date empty', async () => {
    const row = await toRow({
      journeyId: '26-ABC123',
      reference: '26-ABC123',
      status: SUBMITTED,
      commodity: { name: 'Potatoes' },
      consignorName: null
    })

    expect(row.origin).toBe('')
    expect(row.consignor).toBe('')
    expect(row.arrival).toBe('')
  })

  it('Should flag a row as late only when it carries the late indicator', async () => {
    const journey = { journeyId: '26-ABC123', status: DRAFT }

    expect((await toRow(journey)).late).toBe(false)
    expect(
      (await toRow({ ...journey, lateNotificationIndicator: true })).late
    ).toBe(true)
  })

  it('Should leave the plants row without a consignee cell', async () => {
    const row = await toRow({ journeyId: '26-ABC123', status: DRAFT })

    expect(Object.keys(row)).not.toContain('consignee')
  })
})
