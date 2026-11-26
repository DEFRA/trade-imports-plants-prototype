import { afterEach, describe, expect, it } from 'vitest'

import {
  currentOrganisationId,
  enterOrganisationIdForTests,
  organisationIdOf,
  sessionOrganisationId,
  withOrganisationId
} from './organisation-id.js'

describe('sessionOrganisationId', () => {
  it('Should prefer organisationId over currentRelationshipId when both are set', () => {
    expect(
      sessionOrganisationId({
        organisationId: '5900001',
        currentRelationshipId: '5900002'
      })
    ).toBe('5900001')
  })
})

describe('organisationIdOf', () => {
  it('Should read organisationId from verified session credentials', () => {
    expect(
      organisationIdOf({
        auth: { credentials: { organisationId: '5900001' } }
      })
    ).toBe('5900001')
  })

  it('Should read currentRelationshipId when organisationId is absent', () => {
    expect(
      organisationIdOf({
        auth: { credentials: { currentRelationshipId: '5900002' } }
      })
    ).toBe('5900002')
  })

  it('Should return undefined when the request is unauthenticated', () => {
    expect(organisationIdOf({})).toBeUndefined()
    expect(organisationIdOf(null)).toBeUndefined()
    expect(organisationIdOf(undefined)).toBeUndefined()
  })
})

describe('organisation id binding', () => {
  afterEach(() => {
    enterOrganisationIdForTests(undefined)
  })

  it('Should scope currentOrganisationId to withOrganisationId and restore after', () => {
    enterOrganisationIdForTests('outer-org')

    withOrganisationId('org-scoped', () => {
      expect(currentOrganisationId()).toBe('org-scoped')
    })

    expect(currentOrganisationId()).toBe('outer-org')
  })
})
