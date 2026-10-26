import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { config } from '../../../../../../../../config/config.js'
import {
  expectOneLogged,
  expectOneRefusalLogged,
  journeyRequest
} from '../../../../../../engine/test-support.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { resolveSelectionOnSave, SELECTION } from './save-selection.js'
import {
  bookHoldingADeletedRecord,
  DELETED_ID,
  NOT_IN_THE_BOOK
} from './test-support.js'

const JOURNEY_ID = 'HRP-0001'
const FIELD_NAME = 'consignor'
const TECH_IMPORTS = 'tech-imports-ltd'
const NOT_IN_BOOK_MESSAGE = 'Select a consignor from the address book'

const save = (request, selectedId) =>
  resolveSelectionOnSave(request, {
    fieldName: FIELD_NAME,
    selectedId,
    notInBookMessage: NOT_IN_BOOK_MESSAGE
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

  it('Should give the record the posted id names, logging nothing', async () => {
    const selection = await save(request, TECH_IMPORTS)

    expect(selection.outcome).toBe(SELECTION.chosen)
    expect(selection.record).toEqual(
      STUB_BOOK.find((record) => record.id === TECH_IMPORTS)
    )
    expect(request.logger.entries).toEqual([])
  })

  describe('against the real address book', () => {
    const originalMode = config.get('stubMode')

    beforeEach(() => {
      config.set('stubMode', false)
      vi.stubGlobal('fetch', bookHoldingADeletedRecord())
    })

    afterEach(() => {
      config.set('stubMode', originalMode)
      vi.unstubAllGlobals()
    })

    it('Should refuse an id the organisation has deleted', async () => {
      const selection = await save(request, DELETED_ID)

      expect(selection).toEqual({ outcome: SELECTION.notInBook })
    })
  })
})
