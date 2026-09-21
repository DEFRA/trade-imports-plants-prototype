import { describe, expect, it } from 'vitest'

import {
  categories,
  categoriesFor,
  categoriesRequiring,
  commodityTypes,
  genera,
  generaFor,
  lineFields,
  lineFieldsFor
} from './index.js'

const CATEGORY_COUNT = 9
const GENUS_COUNT = 15
const HARDWOOD_GENERA = ['Castanea', 'Fraxinus', 'Platanus']
const POTATOES = 'potatoes'
const PLANTS_FOR_PLANTING = 'plants-for-planting'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const SEED_POTATOES = 'seed-potatoes'
const CONIFER_WOOD_WITH_BARK = 'conifer-wood-with-bark'
const CONIFER_WOOD_WITHOUT_BARK = 'conifer-wood-without-bark'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'
const HARDWOOD_ROUND_SURFACE = 'hardwood-round-surface'
const HARDWOOD_CHIPS = 'hardwood-chips'
const COMMODITY_CODE = 'commodityCode'
const QUANTITY = 'quantity'
const GENUS = 'genus'
const PHYTOSANITARY_TREATMENTS = 'phytosanitaryTreatments'

describe('#commodityTypes', () => {
  it('Should offer the three commodity types in the journey order', () => {
    expect(commodityTypes()).toEqual([
      POTATOES,
      PLANTS_FOR_PLANTING,
      WOOD_AND_CUT_TREES
    ])
  })

  it('Should refuse a caller that tries to extend the list', () => {
    expect(() => commodityTypes().push('bulbs')).toThrow(TypeError)
    expect(commodityTypes()).toHaveLength(3)
  })

  it('Should refuse a caller that tries to rewrite a value', () => {
    expect(() => {
      commodityTypes()[0] = 'bulbs'
    }).toThrow(TypeError)
    expect(commodityTypes()[0]).toBe(POTATOES)
  })
})

describe('#categories and #categoriesFor', () => {
  it('Should offer the nine statutory categories', () => {
    expect(categories()).toHaveLength(CATEGORY_COUNT)
  })

  it('Should partition every category across the three commodity types', () => {
    const grouped = commodityTypes().flatMap((type) => [...categoriesFor(type)])

    expect(grouped.toSorted()).toEqual([...categories()].toSorted())
    expect(new Set(grouped).size).toBe(CATEGORY_COUNT)
  })

  it('Should offer no category for a type the service does not know', () => {
    expect(categoriesFor('bulbs')).toEqual([])
    expect(categoriesFor(undefined)).toEqual([])
  })

  it('Should offer no category for a name Object.prototype answers', () => {
    expect(categoriesFor('toString')).toEqual([])
  })

  it('Should refuse a caller that tries to extend a narrowed list', () => {
    expect(() => categoriesFor(POTATOES).push('bulbs')).toThrow(TypeError)
  })
})

describe('#genera and #generaFor', () => {
  it('Should hold the fifteen entries the regulation lists', () => {
    expect(genera()).toHaveLength(GENUS_COUNT)
  })

  it('Should offer every genus for a plants-for-planting line', () => {
    expect(generaFor(PLANTS_FOR_PLANTING)).toEqual([...genera()])
    expect(generaFor('trees-for-planting')).toEqual([...genera()])
  })

  it('Should narrow a hardwood line to the three hardwood genera', () => {
    expect(generaFor(HARDWOOD_ROUND_SURFACE)).toEqual(HARDWOOD_GENERA)
    expect(generaFor(HARDWOOD_CHIPS)).toEqual(HARDWOOD_GENERA)
  })

  it('Should offer no genus to a category that asks none', () => {
    expect(generaFor(SEED_POTATOES)).toEqual([])
    expect(generaFor(CONIFER_WOOD_WITH_BARK)).toEqual([])
  })

  it('Should offer no genus for a name Object.prototype answers', () => {
    expect(generaFor('constructor')).toEqual([])
    expect(generaFor('__proto__')).toEqual([])
  })

  it('Should offer a genus to exactly the categories that ask for one', () => {
    const asking = categories().filter(
      (category) => generaFor(category).length > 0
    )

    expect(asking).toEqual([...categoriesRequiring(GENUS)])
  })
})

describe('#lineFields, #categoriesRequiring and #lineFieldsFor', () => {
  it('Should name every per-line field except the category that gates them', () => {
    expect(lineFields()).toEqual([
      'genus',
      'species',
      'commodityCode',
      'potatoVariety',
      'quantity',
      'potatoIntendedUse',
      'eppoCode',
      'sizeOfTree',
      'phytosanitaryTreatments'
    ])
  })

  it('Should ask every category for a quantity, which is why it has no gate', () => {
    expect(categoriesRequiring('quantity')).toEqual([...categories()])
  })

  it('Should ask a potato line only for its variety, quantity and use', () => {
    expect(lineFieldsFor(SEED_POTATOES)).toEqual([
      'potatoVariety',
      'quantity',
      'potatoIntendedUse'
    ])
    expect(lineFieldsFor('ware-potatoes')).toEqual(lineFieldsFor(SEED_POTATOES))
  })

  it('Should ask a trees-for-planting line for its size as well', () => {
    expect(lineFieldsFor('trees-for-planting')).toEqual([
      'genus',
      'species',
      'commodityCode',
      'quantity',
      'eppoCode',
      'sizeOfTree'
    ])
    expect(lineFieldsFor(PLANTS_FOR_PLANTING)).toEqual([
      'genus',
      'species',
      'commodityCode',
      'quantity',
      'eppoCode'
    ])
  })

  it('Should ask every wood line for its phytosanitary treatments', () => {
    expect(categoriesRequiring(PHYTOSANITARY_TREATMENTS)).toEqual([
      CONIFER_WOOD_WITH_BARK,
      CONIFER_WOOD_WITHOUT_BARK,
      CUT_CONIFEROUS_TREES,
      HARDWOOD_ROUND_SURFACE,
      HARDWOOD_CHIPS
    ])
  })

  it('Should ask no conifer-wood-with-bark line for a genus or a species', () => {
    expect(lineFieldsFor(CONIFER_WOOD_WITH_BARK)).toEqual([
      COMMODITY_CODE,
      QUANTITY,
      PHYTOSANITARY_TREATMENTS
    ])
  })

  it('Should ask a bark-free conifer-wood line the same three fields', () => {
    expect(lineFieldsFor(CONIFER_WOOD_WITHOUT_BARK)).toEqual([
      COMMODITY_CODE,
      QUANTITY,
      PHYTOSANITARY_TREATMENTS
    ])
  })

  it('Should ask a cut-coniferous-trees line for the size of the tree', () => {
    expect(lineFieldsFor(CUT_CONIFEROUS_TREES)).toEqual([
      COMMODITY_CODE,
      QUANTITY,
      'sizeOfTree',
      PHYTOSANITARY_TREATMENTS
    ])
  })

  it('Should ask a hardwood line for a genus but never a species', () => {
    const hardwoodFields = [
      GENUS,
      COMMODITY_CODE,
      QUANTITY,
      PHYTOSANITARY_TREATMENTS
    ]

    expect(lineFieldsFor(HARDWOOD_ROUND_SURFACE)).toEqual(hardwoodFields)
    expect(lineFieldsFor(HARDWOOD_CHIPS)).toEqual(hardwoodFields)
  })

  it('Should ask nothing of a line with no category yet', () => {
    expect(lineFieldsFor(undefined)).toEqual([])
    expect(lineFieldsFor('')).toEqual([])
  })

  it('Should know no categories for a field it does not hold', () => {
    expect(categoriesRequiring('reasonForImport')).toEqual([])
  })

  it('Should know no categories for a name Object.prototype answers', () => {
    expect(categoriesRequiring('hasOwnProperty')).toEqual([])
  })

  it('Should name only real categories in every allow-list', () => {
    for (const field of lineFields()) {
      const unknown = categoriesRequiring(field).filter(
        (category) => !categories().includes(category)
      )
      expect(unknown, field).toEqual([])
    }
  })
})
