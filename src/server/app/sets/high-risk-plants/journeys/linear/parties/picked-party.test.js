import { describe, expect, it } from 'vitest'

import { STUB_BOOK } from '../../../../../services/address-book/stub/index.js'
import { TECH_IMPORTS_COPY } from '../test-support.js'
import { answerForPickedParty } from './picked-party.js'

describe('answerForPickedParty', () => {
  it('copies a picked record onto the notification in the address book API names', () => {
    const chosen = STUB_BOOK.find((record) => record.id === 'tech-imports-ltd')

    expect(answerForPickedParty(chosen)).toEqual(TECH_IMPORTS_COPY)
  })
})
