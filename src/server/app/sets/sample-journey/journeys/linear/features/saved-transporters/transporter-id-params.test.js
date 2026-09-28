import { describe, expect, it } from 'vitest'

import { transporterIdParams } from './transporter-id-params.js'

const validate = (transporterId) =>
  transporterIdParams.validate({ transporterId })

describe('transporterIdParams', () => {
  it('Should accept the shape idFromName makes: lower-case words joined by hyphens', () => {
    expect(validate('harbourline-haulage-ltd').error).toBeUndefined()
    expect(validate('copperfield-couriers').error).toBeUndefined()
  })

  it('Should refuse an empty, capitalised, or otherwise malformed id', () => {
    expect(validate('').error).toBeDefined()
    expect(validate('Harbourline').error).toBeDefined()
    expect(validate('../etc/passwd').error).toBeDefined()
    expect(validate(undefined).error).toBeDefined()
  })

  it('Should say nothing about a well-shaped id that simply does not exist: that is the handler’s job', () => {
    expect(validate('not-an-id').error).toBeUndefined()
  })
})
