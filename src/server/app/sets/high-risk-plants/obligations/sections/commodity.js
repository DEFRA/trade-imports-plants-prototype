import { allowListed } from '../../../../model/obligations/helpers/index.js'
import { categoriesRequiring } from '../../services/commodities/index.js'

export const commodityType = {
  id: '9f2c4b71-3e58-4a6d-9c02-71d8f5a3e6b4',
  name: 'commodityType',
  status: 'mandatory'
}

// The consignment's commodity lines. A structural group, always in scope: it
// becomes one because every field below names it in `within`. The floor is the
// model's, not the page's — a notification with no line is vacuously satisfied
// without it.
export const commodityLine = {
  id: 'a3d6c1f0-5b27-4e93-9a41-0c8b6e2d7f15',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLines.atLeastOne'
  }
}

// The per-line gate. Every other field on a line reads it at the same identity
// level, so each gate is a same-frame `allowListed` with a null projection.
export const category = {
  id: 'b47e2d18-6c39-4f05-8b52-1d9c7f3e8a26',
  name: 'category',
  within: commodityLine,
  status: 'mandatory'
}

// Every line carries a quantity, whichever category it is, so this one field
// needs no gate. The service still names its categories, so the page and the
// model read one list for every field alike.
export const quantity = {
  id: 'c58f3e29-7d4a-4016-9c63-2e0d8a4f9b37',
  name: 'quantity',
  within: commodityLine,
  status: 'mandatory'
}

const appliesBecauseCategory = (field) => [
  {
    code: `obligation.${field}.applicable.becauseCategory`,
    explanation: `${field} applies on lines whose category asks for it`
  }
]

/**
 * A per-line field scoped to the categories the set-owned service says ask for
 * it. The allow-list is read lazily, at gate execution: an obligation module
 * does no IO and reads no reference data when it loads.
 *
 * @param {string} id - the obligation's UUID.
 * @param {string} name - the field name, which is also the service's key.
 * @returns {object} the obligation.
 */
const gatedOnCategory = (id, name) => ({
  id,
  name,
  within: commodityLine,
  status: 'mandatory',
  applyTo: allowListed(
    category,
    () => categoriesRequiring(name),
    null,
    appliesBecauseCategory(name)
  )
})

export const genus = gatedOnCategory(
  'd6903f3a-8e5b-4127-8d74-3f1e9b5a0c48',
  'genus'
)

export const species = gatedOnCategory(
  'e7a14b4b-9f6c-4238-9e85-401fac6b1d59',
  'species'
)

export const commodityCode = gatedOnCategory(
  'f8b25c5c-a07d-4349-8f96-512abd7c2e6a',
  'commodityCode'
)

export const potatoVariety = gatedOnCategory(
  '09c36d6d-b18e-445a-9007-623bce8d3f7b',
  'potatoVariety'
)

export const potatoIntendedUse = gatedOnCategory(
  '1ad47e7e-c29f-456b-8118-734cdf9e408c',
  'potatoIntendedUse'
)

export const eppoCode = gatedOnCategory(
  '2be58f8f-d3a0-467c-9229-845de0af519d',
  'eppoCode'
)

export const sizeOfTree = gatedOnCategory(
  '3cf69090-e4b1-478d-833a-956ef1b062ae',
  'sizeOfTree'
)

export const phytosanitaryTreatments = gatedOnCategory(
  '4d07a1a1-f5c2-489e-944b-a67f02c173bf',
  'phytosanitaryTreatments'
)
