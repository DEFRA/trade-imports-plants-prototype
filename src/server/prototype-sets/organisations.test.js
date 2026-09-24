import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ORGANISATION_ID,
  organisationName,
  PROTOTYPE_ORGANISATIONS
} from './organisations.js'

describe('the prototype organisations registry', () => {
  it('Should offer more than one organisation to switch between', () => {
    expect(PROTOTYPE_ORGANISATIONS.length).toBeGreaterThan(1)
  })

  it('Should default to the first organisation listed', () => {
    expect(DEFAULT_ORGANISATION_ID).toBe(PROTOTYPE_ORGANISATIONS[0].id)
  })

  it('Should name a known organisation', () => {
    const [first] = PROTOTYPE_ORGANISATIONS

    expect(organisationName(first.id)).toBe(first.name)
  })

  it('Should answer undefined for an organisation it does not know', () => {
    expect(organisationName('not-a-known-org')).toBeUndefined()
  })
})
