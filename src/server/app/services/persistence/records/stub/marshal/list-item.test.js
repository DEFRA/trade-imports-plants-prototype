import { beforeEach, describe, expect, test, vi } from 'vitest'
import { DRAFT, SUBMITTED } from '../../../../../engine/persistence/records.js'

const PARTY_NAME = 'Northgate Trading AG'

const projectAnswers = vi.fn()

vi.mock('../../../../../bridge/fulfilments/index.js', () => ({
  projectAnswers: (...args) => projectAnswers(...args)
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
    projectAnswers.mockReturnValue({ consignor: { name: PARTY_NAME } })
  })

  test.each([DRAFT, SUBMITTED])(
    'Should read the name from the copy on a %s row',
    (status) => {
      expect(marshalListItem(documentWith(status)).consignorName).toBe(
        PARTY_NAME
      )
    }
  )

  test('Should show no name for a party with no copy', () => {
    projectAnswers.mockReturnValue({})
    expect(marshalListItem(documentWith(DRAFT)).consignorName).toBeNull()
  })
})
