import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { store } from '../../engine/store.js'
import { configureRecords } from '../../engine/persistence/records.js'
import { configureSession } from '../../engine/persistence/session.js'
import { records as recordsStub } from '../../services/persistence/records/stub/index.js'
import { session as sessionStub } from '../../services/persistence/session/stub.js'
import { driveHandler } from '../../engine/test-support.js'
import { configureReadyForCheckYourAnswers } from '../../engine/read.js'
import * as state from '../../engine/index.js'
import { compose, maxText, validate } from './index.js'

const fields = compose(maxText('textFieldTwo', 58))

const commitReference = async (request, h) => {
  const payload = request.payload ?? {}
  const raw = payload.textFieldTwo ?? ''
  const { value: clean, errors } = validate(fields, payload)
  if (errors) {
    return h.view('reference', { value: raw, errors })
  }
  await state.commit(request, h, {
    textFieldTwo: clean.textFieldTwo ?? ''
  })
  return h.redirect('/next')
}

describe('The cleaned value is persisted, not the raw payload', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })
  beforeEach(() => store.clear())

  it('Should persist the trimmed value, not the surrounding whitespace the user typed', async () => {
    const { after } = await driveHandler(commitReference, {
      payload: { textFieldTwo: '  text-two-1500  ' }
    })
    expect(after.textFieldTwo).toBe('text-two-1500')
  })
})

describe('An invalid value echoes the raw input and commits nothing', () => {
  beforeAll(() => {
    configureRecords(recordsStub)
    configureSession(sessionStub)
    configureReadyForCheckYourAnswers(() => false)
  })
  beforeEach(() => store.clear())

  it('Should re-render with the raw over-long value and commit nothing', async () => {
    const raw = 'D'.repeat(59)
    const { after, view } = await driveHandler(commitReference, {
      payload: { textFieldTwo: raw }
    })
    expect(view.context.value).toBe(raw)
    expect(view.context.errors).toHaveProperty('textFieldTwo')
    expect(after.textFieldTwo).toBeUndefined()
  })
})
