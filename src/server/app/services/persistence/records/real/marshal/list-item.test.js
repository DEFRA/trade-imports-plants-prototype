import { beforeEach, describe, expect, test, vi } from 'vitest'

const party = vi.fn()

vi.mock('../../../../address-book/index.js', () => ({
  party: (...args) => party(...args)
}))

const { listItemMarshaller } = await import('./list-item.js')

const ORGANISATION = '5900002'
const PARTY_NAME = 'Northgate Trading AG'
const FROZEN_NAME = 'Frozen At Submit'

const notificationWith = (consignmentParty) => ({
  referenceNumber: 'HRP-0001',
  status: 'SUBMITTED',
  consignor: consignmentParty,
  consignee: consignmentParty
})

describe('real dashboard row names', () => {
  beforeEach(() => {
    party.mockResolvedValue({ name: PARTY_NAME })
  })

  test('Should resolve submitted bare address references for both parties with one lookup', async () => {
    const marshal = listItemMarshaller(ORGANISATION)
    const row = await marshal(notificationWith({ addressId: 'addr-1' }))

    expect(row.consignorName).toBe(PARTY_NAME)
    expect(row.consigneeName).toBe(PARTY_NAME)
    expect(party).toHaveBeenCalledExactlyOnceWith(ORGANISATION, 'addr-1')
  })

  test('Should prefer frozen submitted names without looking up the address', async () => {
    const marshal = listItemMarshaller(ORGANISATION)
    const row = await marshal(
      notificationWith({ addressId: 'addr-1', name: FROZEN_NAME })
    )

    expect(row.consignorName).toBe(FROZEN_NAME)
    expect(row.consigneeName).toBe(FROZEN_NAME)
    expect(party).not.toHaveBeenCalled()
  })

  test('Should show no name for a deleted submitted address reference', async () => {
    party.mockResolvedValue({ name: PARTY_NAME, deleted: true })
    const marshal = listItemMarshaller(ORGANISATION)
    const row = await marshal(notificationWith({ addressId: 'addr-1' }))

    expect(row.consignorName).toBeNull()
    expect(row.consigneeName).toBeNull()
  })
})
