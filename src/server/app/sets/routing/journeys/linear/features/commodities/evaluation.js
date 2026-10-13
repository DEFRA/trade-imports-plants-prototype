import {
  feature,
  grouped
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  category,
  commodityCode,
  commodityLine,
  eppoCode,
  genus,
  phytosanitaryTreatments,
  potatoIntendedUse,
  potatoVariety,
  quantity,
  sizeOfTree,
  species
} from '../../../../obligations/index.js'

const line = {
  field: 'commodityLines',
  token: 'line',
  obligation: commodityLine
}

const lineLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [line] })

export const evaluationBindings = feature('commodities', [
  lineLeaf('category', category),
  lineLeaf('genus', genus),
  lineLeaf('species', species),
  lineLeaf('commodityCode', commodityCode),
  lineLeaf('quantity', quantity),
  lineLeaf('potatoVariety', potatoVariety),
  lineLeaf('potatoIntendedUse', potatoIntendedUse),
  lineLeaf('eppoCode', eppoCode),
  lineLeaf('sizeOfTree', sizeOfTree),
  lineLeaf('phytosanitaryTreatments', phytosanitaryTreatments)
])
