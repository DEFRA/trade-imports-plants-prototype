import { beforeEach, describe, expect, test, vi } from 'vitest'
import { DRAFT, SUBMITTED } from '../../../../../engine/persistence/records.js'

const PARTY_NAME = 'Northgate Trading AG'

const projectAnswers = vi.fn()
const party = vi.fn()

vi.mock('../../../../../bridge/fulfilments/index.js', () => ({
  projectAnswers: (...args) => projectAnswers(...args)
}))
vi.mock('../../../../address-book/index.js', () => ({
  party: (...args) => party(...args)
}))

const { marshalListItem } = await import('./list-item.js')

const documentWith = (status) => ({
  id: 'HRP-0001',
  status,
  createdAt: '2026-09-01T00:00:00.000Z',
  submittedAt: status === SUBMITTED ? '2026-09-02T00:00:00.000Z' : null,
  fulfilment: []
})

describe('stub dashboard row names', () => {
  beforeEach(() => {
    projectAnswers.mockReturnValue({ consignor: { addressId: 'addr-1' } })
    party.mockResolvedValue({ name: PARTY_NAME })
  })

  test('Should resolve a stored reference on a draft row', async () => {
    const row = await marshalListItem(documentWith(DRAFT))
    expect(row.consignorName).toBe(PARTY_NAME)
  })

  test('Should keep resolving a stored reference once the row is submitted', async () => {
    // This journey stores `{ addressId }` and freezes no name at submit, so a
    // submitted row must still resolve rather than read as no name at all.
    const row = await marshalListItem(documentWith(SUBMITTED))
    expect(row.consignorName).toBe(PARTY_NAME)
  })

  test('Should prefer a frozen name over the book on a submitted row', async () => {
    projectAnswers.mockReturnValue({
      consignor: { addressId: 'addr-1', name: 'Frozen At Submit' }
    })
    const row = await marshalListItem(documentWith(SUBMITTED))
    expect(row.consignorName).toBe('Frozen At Submit')
    expect(party).not.toHaveBeenCalled()
  })

  test('Should read a deleted address as no name', async () => {
    party.mockResolvedValue({ name: PARTY_NAME, deleted: true })
    const row = await marshalListItem(documentWith(SUBMITTED))
    expect(row.consignorName).toBeNull()
  })
})
