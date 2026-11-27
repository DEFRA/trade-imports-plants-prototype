import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  enterOrganisationIdForTests,
  ORGANISATION_ID_HEADER
} from '../../../../../../common/helpers/organisation-id.js'
import { headers } from './headers.js'

describe('notification backend headers', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    enterOrganisationIdForTests(undefined)
  })

  it('Should send the bound organisation id', () => {
    enterOrganisationIdForTests('5900042')

    expect(headers()[ORGANISATION_ID_HEADER]).toBe('5900042')
  })

  it('Should refuse to call the backend without a session organisation', () => {
    enterOrganisationIdForTests(undefined)

    expect(() => headers()).toThrow(
      /Cannot reach the notifications backend without an organisation from the signed-in session/
    )
  })

  it('Should refuse without a session organisation outside test', () => {
    vi.stubEnv('NODE_ENV', 'production')
    enterOrganisationIdForTests(undefined)

    expect(() => headers()).toThrow(
      /Cannot reach the notifications backend without an organisation from the signed-in session/
    )
  })
})
