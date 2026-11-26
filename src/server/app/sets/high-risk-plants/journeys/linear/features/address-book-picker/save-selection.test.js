import { beforeEach, describe, expect, it } from 'vitest'

import {
  addressBookAnswering,
  expectOneLogged,
  expectOneRefusalLogged,
  journeyRequest,
  resetMocksAndConfigAfterTests
} from '../../../../../../engine/test-support.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { resolveSelectionOnSave, SELECTION } from './save-selection.js'
import {
  addressResponseForABookHoldingADeletedRecord,
  DELETED_ID,
  NOT_IN_THE_BOOK
} from './test-support.js'
import { TECH_IMPORTS_ID } from '../../test-support.js'

const JOURNEY_ID = 'HRP-0001'
const FIELD_NAME = 'consignor'
const FIELD_ROLE = 'CONSIGNOR'
const NOT_IN_BOOK_MESSAGE = 'Select a consignor from the address book'

const save = (request, selectedId) =>
  resolveSelectionOnSave(request, {
    fieldName: FIELD_NAME,
    selectedId,
    notInBookMessage: NOT_IN_BOOK_MESSAGE,
    role: FIELD_ROLE
  })

describe('#resolveSelectionOnSave', () => {
  let request

  beforeEach(() => {
    request = journeyRequest(JOURNEY_ID)
  })

  it('Should resolve to nothing chosen when nothing was posted, logging the save', async () => {
    const selection = await save(request, '')

    expect(selection).toEqual({ outcome: SELECTION.nothingChosen })
    expectOneLogged(request.logger, {
      level: 'info',
      fields: { journeyId: JOURNEY_ID, fieldName: FIELD_NAME },
      message: 'Address picker saved with no address chosen, nothing committed'
    })
  })

  it('Should refuse an id the address book does not hold, logging the refused id', async () => {
    const selection = await save(request, NOT_IN_THE_BOOK)

    expect(selection).toEqual({ outcome: SELECTION.notInBook })
    expectOneRefusalLogged(request.logger, {
      journeyId: JOURNEY_ID,
      errorCodes: [FIELD_NAME],
      reason: 'not-in-address-book',
      addressId: NOT_IN_THE_BOOK
    })
  })

  it('Should refuse a record that does not carry the role asked for, logging the refused id', async () => {
    const selection = await save(request, TECH_IMPORTS_ID)

    expect(selection).toEqual({ outcome: SELECTION.notInBook })
    expectOneRefusalLogged(request.logger, {
      journeyId: JOURNEY_ID,
      errorCodes: [FIELD_NAME],
      reason: 'not-in-address-book',
      addressId: TECH_IMPORTS_ID
    })
  })

  it('Should give the record the posted id names when it carries the role asked for, logging nothing', async () => {
    const consignorRecord = STUB_BOOK.find((record) =>
      record.roles.includes(FIELD_ROLE)
    )

    const selection = await save(request, consignorRecord.id)

    expect(selection.outcome).toBe(SELECTION.chosen)
    expect(selection.record).toEqual(consignorRecord)
    expect(request.logger.entries).toEqual([])
  })

  describe('against the real address book', () => {
    resetMocksAndConfigAfterTests()

    beforeEach(() => {
      addressBookAnswering(addressResponseForABookHoldingADeletedRecord)
    })

    it('Should refuse an id the organisation has deleted', async () => {
      const selection = await save(request, DELETED_ID)

      expect(selection).toEqual({ outcome: SELECTION.notInBook })
    })
  })
})
