/**
 * SYNTHETIC FIXTURE — owned by the tests, not journey content.
 *
 * Fulfilment bindings for the fixture obligation set. The registry
 * requires every leaf obligation to be owned by exactly one feature, so
 * this file must stay in step with `./obligations.js`.
 *
 * Each binding's `field` is the stored answer key, which for this fixture
 * is always the obligation's own `name`.
 */

import {
  feature,
  grouped,
  scalar
} from '../../src/server/app/bridge/fulfilment-bindings.js'
import {
  aggregateGatedField,
  aggregateGatedToggle,
  boundedCollection,
  boundedItemDate,
  boundedItemFilename,
  boundedItemMode,
  boundedItemReference,
  boundedItemType,
  boundedItemUploadId,
  branchAField,
  branchBCField,
  branchBDField,
  branchDField,
  branchSelector,
  compositeBlockFive,
  compositeBlockFour,
  compositeBlockOne,
  compositeBlockSix,
  compositeBlockThree,
  compositeBlockTwo,
  dateField,
  enumScalarField,
  itemCategory,
  itemCollection,
  itemCount,
  itemGatedField,
  itemSelector,
  itemTags,
  lookupField,
  modeGatedList,
  modeSelector,
  nestedCollection,
  nestedCompositeBlock,
  nestedFallbackFieldA,
  nestedFallbackFieldB,
  nestedGatedFieldA,
  nestedGatedFieldB,
  nestedGatedFieldC,
  nestedGatedFieldD,
  optionalScalarField,
  scalarField,
  statusFlipField,
  statusToggle,
  systemPopulatedField,
  textFieldOne,
  textFieldTwo,
  variantOneBlock,
  variantSelector,
  variantTwoBlock
} from './obligations.js'

const itemGroup = {
  field: 'itemCollection',
  token: 'item',
  obligation: itemCollection
}

const nestedGroup = {
  field: 'nestedCollection',
  token: 'nested',
  obligation: nestedCollection
}

const boundedGroup = {
  field: 'boundedCollection',
  token: 'bounded',
  obligation: boundedCollection
}

const named = (obligation, options = {}) =>
  scalar({ field: obligation.name, obligation, ...options })

const itemLeaf = (obligation, options = {}) =>
  grouped({
    field: obligation.name,
    obligation,
    groups: [itemGroup],
    ...options
  })

const nestedLeaf = (obligation) =>
  grouped({
    field: obligation.name,
    obligation,
    groups: [itemGroup, nestedGroup]
  })

const boundedLeaf = (obligation) =>
  grouped({
    field: obligation.name,
    obligation,
    groups: [boundedGroup]
  })

const toNumberWhenParses = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return value
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : value
}

export const systemBindings = feature('system', [named(systemPopulatedField)])

export const scalarBindings = feature('scalars', [
  named(scalarField),
  named(statusToggle),
  named(statusFlipField),
  named(optionalScalarField)
])

export const branchBindings = feature('branch', [
  named(branchSelector),
  named(branchAField),
  named(branchBCField),
  named(branchBDField),
  named(branchDField)
])

export const detailBindings = feature('details', [
  named(enumScalarField),
  named(aggregateGatedToggle)
])

export const blockBindings = feature('blocks', [
  named(compositeBlockOne),
  named(compositeBlockTwo),
  named(compositeBlockThree),
  named(compositeBlockFour),
  named(compositeBlockFive)
])

export const blockSixBindings = feature('blockSix', [named(compositeBlockSix)])

export const aggregateBindings = feature('aggregate', [
  named(aggregateGatedField)
])

export const lookupBindings = feature('lookup', [
  named(lookupField),
  named(dateField)
])

export const selectorBindings = feature('selectors', [
  named(variantSelector),
  named(variantOneBlock),
  named(variantTwoBlock),
  named(modeSelector),
  named(modeGatedList),
  named(textFieldOne),
  named(textFieldTwo)
])

export const itemBindings = feature('items', [
  itemLeaf(itemSelector),
  itemLeaf(itemCategory),
  itemLeaf(itemTags),
  itemLeaf(itemCount, { convert: toNumberWhenParses }),
  itemLeaf(itemGatedField),
  nestedLeaf(nestedGatedFieldA),
  nestedLeaf(nestedGatedFieldB),
  nestedLeaf(nestedGatedFieldC),
  nestedLeaf(nestedGatedFieldD),
  nestedLeaf(nestedFallbackFieldA),
  nestedLeaf(nestedFallbackFieldB),
  nestedLeaf(nestedCompositeBlock)
])

export const boundedBindings = feature('bounded', [
  boundedLeaf(boundedItemType),
  boundedLeaf(boundedItemMode),
  boundedLeaf(boundedItemReference),
  boundedLeaf(boundedItemDate),
  boundedLeaf(boundedItemUploadId),
  boundedLeaf(boundedItemFilename)
])

export const featureEvaluationBindings = Object.freeze([
  systemBindings,
  scalarBindings,
  branchBindings,
  detailBindings,
  blockBindings,
  blockSixBindings,
  aggregateBindings,
  lookupBindings,
  selectorBindings,
  itemBindings,
  boundedBindings
])
