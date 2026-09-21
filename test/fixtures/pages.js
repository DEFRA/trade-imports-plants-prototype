/**
 * SYNTHETIC FIXTURE — owned by the tests, not journey content.
 *
 * The dispatch pages for the fixture set. `buildDispatch` asserts that
 * every obligation except the system-populated ones is collected by
 * exactly one page, so this file must stay in step with
 * `./obligations.js`.
 *
 * A page claims a root name or a dotted name-path; ownership of anything
 * deeper is derived, so `itemsPage` covers the whole `itemCollection`
 * subtree apart from the `nestedCollection` branch `itemDetailPage`
 * claims explicitly.
 */

export const scalarsPage = {
  id: 'scalarsPage',
  slug: 'scalars',
  collects: [
    'scalarField',
    'statusToggle',
    'statusFlipField',
    'optionalScalarField'
  ]
}

export const itemsPage = {
  id: 'itemsPage',
  slug: 'items',
  collects: ['itemCollection']
}

export const itemDetailPage = {
  id: 'itemDetailPage',
  slug: 'item-detail',
  collects: ['itemCollection.nestedCollection']
}

export const branchPage = {
  id: 'branchPage',
  slug: 'branch',
  collects: ['branchSelector', 'branchAField']
}

export const branchBCPage = {
  id: 'branchBCPage',
  slug: 'branch-bc',
  collects: ['branchBCField']
}

export const branchBDPage = {
  id: 'branchBDPage',
  slug: 'branch-bd',
  collects: ['branchBDField']
}

export const branchDPage = {
  id: 'branchDPage',
  slug: 'branch-d',
  collects: ['branchDField']
}

export const detailsPage = {
  id: 'detailsPage',
  slug: 'details',
  collects: ['enumScalarField', 'aggregateGatedToggle']
}

export const boundedPage = {
  id: 'boundedPage',
  slug: 'bounded',
  collects: ['boundedCollection']
}

export const blocksPage = {
  id: 'blocksPage',
  slug: 'blocks',
  collects: [
    'compositeBlockOne',
    'compositeBlockTwo',
    'compositeBlockThree',
    'compositeBlockFour',
    'compositeBlockFive'
  ]
}

export const aggregatePage = {
  id: 'aggregatePage',
  slug: 'aggregate',
  collects: ['aggregateGatedField']
}

export const lookupPage = {
  id: 'lookupPage',
  slug: 'lookup',
  collects: ['lookupField', 'dateField']
}

export const modeGatedPage = {
  id: 'modeGatedPage',
  slug: 'mode-gated',
  collects: ['modeGatedList']
}

export const selectorsPage = {
  id: 'selectorsPage',
  slug: 'selectors',
  collects: ['variantSelector', 'modeSelector', 'textFieldOne', 'textFieldTwo']
}

export const variantOnePage = {
  id: 'variantOnePage',
  slug: 'variant-one',
  collects: ['variantOneBlock']
}

export const variantTwoPage = {
  id: 'variantTwoPage',
  slug: 'variant-two',
  collects: ['variantTwoBlock']
}

export const blockSixPage = {
  id: 'blockSixPage',
  slug: 'block-six',
  collects: ['compositeBlockSix']
}

// Collects nothing: it is the page that owns the flow-only key, which is
// never a manifest obligation.
export const flowOnlyPage = {
  id: 'flowOnlyPage',
  slug: 'flow-only',
  collects: []
}

export const dispatchPages = [
  scalarsPage,
  itemsPage,
  itemDetailPage,
  branchPage,
  branchBCPage,
  branchBDPage,
  branchDPage,
  detailsPage,
  boundedPage,
  blocksPage,
  aggregatePage,
  lookupPage,
  modeGatedPage,
  selectorsPage,
  variantOnePage,
  variantTwoPage,
  blockSixPage,
  flowOnlyPage
]
