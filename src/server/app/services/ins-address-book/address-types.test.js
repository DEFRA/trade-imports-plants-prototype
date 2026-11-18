import { describe, expect, test } from 'vitest'

import {
  PLACE_ROLES,
  ROLES_BY_ADDRESS_TYPE,
  addressTypeOfRole,
  keepRolesOfferedBy
} from './address-types.js'

describe('the roles each address type lists', () => {
  test("Should list each address type's roles in this order", () => {
    expect(ROLES_BY_ADDRESS_TYPE).toEqual({
      ORIGIN_OR_CONSIGNOR: ['PLACE_OF_ORIGIN', 'CONSIGNOR'],
      DESTINATION_CONSIGNEE_OR_IMPORTER: [
        'CONSIGNEE',
        'IMPORTER',
        'PLACE_OF_DESTINATION'
      ],
      BRANCH: ['BRANCH_ADDRESS']
    })
  })
})

describe('the roles an address type offers', () => {
  test('Should keep the given roles the address type offers, in ROLES_BY_ADDRESS_TYPE order', () => {
    expect(
      keepRolesOfferedBy('ORIGIN_OR_CONSIGNOR', [
        'CONSIGNOR',
        'PLACE_OF_ORIGIN'
      ])
    ).toEqual(['PLACE_OF_ORIGIN', 'CONSIGNOR'])
    expect(
      keepRolesOfferedBy('DESTINATION_CONSIGNEE_OR_IMPORTER', [
        'PLACE_OF_DESTINATION',
        'CONSIGNEE'
      ])
    ).toEqual(['CONSIGNEE', 'PLACE_OF_DESTINATION'])
  })

  test('Should drop a given role the address type does not offer', () => {
    expect(
      keepRolesOfferedBy('ORIGIN_OR_CONSIGNOR', ['CONSIGNOR', 'IMPORTER'])
    ).toEqual(['CONSIGNOR'])
    expect(keepRolesOfferedBy('BRANCH', ['CONSIGNOR'])).toEqual([])
  })
})

describe('the address type that holds a role', () => {
  test.each(
    Object.entries(ROLES_BY_ADDRESS_TYPE).flatMap(([addressType, roles]) =>
      roles.map((role) => [role, addressType])
    )
  )('Should give the type %s is listed under', (role, addressType) => {
    expect(addressTypeOfRole(role)).toBe(addressType)
  })

  test('Should give no type for a role no type holds', () => {
    expect(addressTypeOfRole('TRANSPORTER')).toBeUndefined()
  })
})

describe('the place roles', () => {
  test('Should be exactly the place of origin and the place of destination, in that order', () => {
    expect(PLACE_ROLES).toEqual(['PLACE_OF_ORIGIN', 'PLACE_OF_DESTINATION'])
  })
})
