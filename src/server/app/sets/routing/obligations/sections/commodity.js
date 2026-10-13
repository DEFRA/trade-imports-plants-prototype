import { allowListed } from '../../../../model/obligations/helpers/index.js'
import { categoriesRequiring } from '../../services/commodities/index.js'

export const commodityType = {
  id: 'd3b6b1c8-0bfb-459d-ae0e-cb47eca56d0e',
  name: 'commodityType',
  status: 'mandatory'
}

// The consignment's commodity lines. A structural group, always in scope: it
// becomes one because every field below names it in `within`. The floor is the
// model's, not the page's — a notification with no line is vacuously satisfied
// without it.
export const commodityLine = {
  id: '01d36c44-86b4-4a4f-b02b-a3407a7b00e1',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLines.atLeastOne'
  }
}

// The per-line gate. Every other field on a line reads it at the same identity
// level, so each gate is a same-frame `allowListed` with a null projection.
export const category = {
  id: 'c400219c-98e4-480f-9a22-cc0f9f99c725',
  name: 'category',
  within: commodityLine,
  status: 'mandatory'
}

// Every line carries a quantity, whichever category it is, so this one field
// needs no gate. The service still names its categories, so the page and the
// model read one list for every field alike.
export const quantity = {
  id: 'aae42f58-6d37-4b72-835c-b0c5fedfeb7d',
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
  '14f262dd-fecf-4d84-bcfa-fa07713488dc',
  'genus'
)

export const species = gatedOnCategory(
  'c62f2768-cd22-45d6-b17a-c61853edef79',
  'species'
)

export const commodityCode = gatedOnCategory(
  'cd311642-126f-4f41-a039-bea0488276d3',
  'commodityCode'
)

export const potatoVariety = gatedOnCategory(
  '0dfa71dd-c2fa-47cc-9e60-f41db00d5ef0',
  'potatoVariety'
)

export const potatoIntendedUse = gatedOnCategory(
  'a661cc15-3220-469c-b1b3-156ecea4c365',
  'potatoIntendedUse'
)

export const eppoCode = gatedOnCategory(
  '307a11e6-24f2-44e3-855d-8493edf1c893',
  'eppoCode'
)

export const sizeOfTree = gatedOnCategory(
  'd6065e4a-fa92-41ac-ba3a-ee6eb0dd7cbd',
  'sizeOfTree'
)

export const phytosanitaryTreatments = gatedOnCategory(
  '5525c7e5-7221-46af-8b7a-82b1771a4a81',
  'phytosanitaryTreatments'
)
