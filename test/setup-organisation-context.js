import { afterEach, beforeEach } from 'vitest'

import { enterOrganisationIdForTests } from '../src/server/common/helpers/organisation-id.js'

beforeEach(() => {
  enterOrganisationIdForTests('5900001')
})

afterEach(() => {
  enterOrganisationIdForTests(undefined)
})
