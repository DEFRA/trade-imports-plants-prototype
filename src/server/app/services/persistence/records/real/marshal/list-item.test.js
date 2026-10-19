import { describe, expect, test } from 'vitest'
import { marshalListItem } from './list-item.js'

const PARTY_NAME = 'Northgate Trading AG'

const notificationWith = (status, consignmentParty) => ({
  referenceNumber: 'HRP-0001',
  status,
  consignor: consignmentParty,
  consignee: consignmentParty
})

describe('real dashboard row names', () => {
  test.each(['DRAFT', 'SUBMITTED'])(
    'Should read both party names from the copy on a %s row',
    (status) => {
      const row = marshalListItem(
        notificationWith(status, { name: PARTY_NAME })
      )

      expect(row.consignorName).toBe(PARTY_NAME)
      expect(row.consigneeName).toBe(PARTY_NAME)
    }
  )

  test('Should show no name for a party with no copy', () => {
    const row = marshalListItem(notificationWith('DRAFT', undefined))

    expect(row.consignorName).toBeNull()
    expect(row.consigneeName).toBeNull()
  })
})
