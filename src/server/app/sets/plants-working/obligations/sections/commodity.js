import { allowListed } from '../../../../model/obligations/helpers/index.js'
import { categoriesRequiring } from '../../services/commodities/index.js'

export const commodityType = {
  id: '79c29ab7-1d31-4c1b-97cc-f29d7dbed565',
  name: 'commodityType',
  status: 'mandatory'
}

// The consignment's commodity lines. A structural group, always in scope: it
// becomes one because every field below names it in `within`. The floor is the
// model's, not the page's — a notification with no line is vacuously satisfied
// without it.
export const commodityLine = {
  id: 'd3373062-7410-4aca-a428-987a8ec1c327',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLines.atLeastOne'
  }
}

// The per-line gate. Every other field on a line reads it at the same identity
// level, so each gate is a same-frame `allowListed` with a null projection.
export const category = {
  id: '086d9d97-6b2d-46e2-8baf-77b610234c7f',
  name: 'category',
  within: commodityLine,
  status: 'mandatory'
}

// Every line carries a quantity, whichever category it is, so this one field
// needs no gate. The service still names its categories, so the page and the
// model read one list for every field alike.
export const quantity = {
  id: 'b770e055-9da3-4d40-a79d-9a61b183feaf',
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
  'fb1fa329-a6ad-4d24-8793-6e42dc778cfd',
  'genus'
)

export const species = gatedOnCategory(
  'd6ecfe80-2bfb-40b2-b6b4-c596d8de396c',
  'species'
)

export const commodityCode = gatedOnCategory(
  'fec290c7-630f-4026-a45c-16cb829b6d58',
  'commodityCode'
)

export const potatoVariety = gatedOnCategory(
  '6f2c3745-9b1e-4e72-86de-92af7552c0af',
  'potatoVariety'
)

export const potatoIntendedUse = gatedOnCategory(
  '70565508-0fc6-47ce-82cf-038ad9ef9757',
  'potatoIntendedUse'
)

export const eppoCode = gatedOnCategory(
  'ec952625-192c-4ebd-9278-263a75727a1e',
  'eppoCode'
)

export const sizeOfTree = gatedOnCategory(
  'f9134e70-27b7-4b27-91e9-d68c9dcf9e8a',
  'sizeOfTree'
)

export const phytosanitaryTreatments = gatedOnCategory(
  'cea0f32d-1474-4447-bd27-5825a416425a',
  'phytosanitaryTreatments'
)
