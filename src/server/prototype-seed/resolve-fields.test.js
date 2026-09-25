import { describe, expect, it } from 'vitest'
import { resolveFields } from './resolve-fields.js'

describe('resolveFields', () => {
  it('Should resolve a relative arrivalDate against the date supplied', () => {
    const step = {
      slug: 'arrival-details',
      fields: { arrivalDate: { daysFromToday: 3 } }
    }

    const resolved = resolveFields(step, new Date('2026-01-01'))

    expect(resolved.arrivalDate).toBe('4/1/2026')
  })

  it('Should leave every other field untouched', () => {
    const step = {
      slug: 'origin',
      fields: { countryOfOrigin: 'ES' }
    }

    expect(resolveFields(step)).toEqual({ countryOfOrigin: 'ES' })
  })

  it('Should not mutate the step it was given', () => {
    const step = { slug: 'commodities', fields: {} }

    const resolved = resolveFields(step)
    resolved.mutated = true

    expect(step.fields).toEqual({})
  })
})
