import { describe, expect, it } from 'vitest'
import { fulfilmentToNotification } from './index.js'

describe('notification projection', () => {
  it('Should omit system lateness because NotificationDto has no typed field for it', () => {
    expect(
      fulfilmentToNotification(
        { 'c9e1043b-7fba-42d2-80c2-6d6384d9630c': 'late' },
        'HRP-0001'
      )
    ).toEqual({ referenceNumber: 'HRP-0001' })
  })

  it('Should omit consignor content from the envelope while canonical fulfilment owns it', () => {
    expect(
      fulfilmentToNotification(
        {
          'a9e33c57-8b13-4c7d-92db-0460fd0d2f68': {
            addressId: 'tech-imports-ltd',
            name: 'Tech Imports Ltd',
            address: {
              telephoneNumber: '01234567890',
              emailAddress: 'contact@example.com'
            }
          },
          '26c11d80-6b9c-4211-9fad-1e47046658cb': 'ID_123',
          '3c59568c-1954-4cae-9c96-65274ea68b1c': 'ID_123',
          '33d7105c-776d-475d-8653-414f326182cd': 'ID_123',
          '1d3e1a55-6e0e-4322-ae2c-48a43b6c7b71': 'ID_123',
          '478148de-8e15-4c44-a435-15f24a1c177b': {
            addressId: 'tech-imports-ltd'
          }
        },
        'HRP-0001'
      )
    ).toEqual({ referenceNumber: 'HRP-0001' })
  })
})
