import { createFakeStore } from '../../../prototype-support/fake-store.js'
import {
  idFromName,
  searchRecords
} from '../../../prototype-support/search-page.js'
import { toRecord, TRANSPORTER_TYPES, validationError } from './client.js'

/**
 * The stub: seven made-up transporters every organisation sees, plus the
 * ones people add, kept per design release and per organisation. Reset
 * clears what people added in that release only.
 */

const UNITED_KINGDOM = 'United Kingdom'

/** Starter rows, in the API's shape (`CONTRACT.record` in `./index.js`). */
export const STARTER_TRANSPORTERS = Object.freeze([
  {
    id: 'harbourline-haulage-ltd',
    name: 'Harbourline Haulage Ltd',
    transporterType: 'commercial',
    approvalNumber: 'UK/SUFFOLK/T1/00092001',
    approvalStatus: 'approved',
    addressLine1: '4 Quayside Park',
    townOrCity: 'Felixstowe',
    postcode: 'IP11 3QT',
    country: UNITED_KINGDOM,
    deleted: false
  },
  {
    id: 'north-sea-freight-bv',
    name: 'North Sea Freight BV',
    transporterType: 'commercial',
    approvalNumber: 'NL/ROTTERDAM/T1/00081002',
    approvalStatus: 'approved',
    addressLine1: 'Havenweg 12',
    townOrCity: 'Rotterdam',
    postcode: '3089 JB',
    country: 'Netherlands',
    deleted: false
  },
  {
    id: 'greenway-plant-transport-ltd',
    name: 'Greenway Plant Transport Ltd',
    transporterType: 'commercial',
    approvalNumber: 'UK/LINCOLNSHIRE/T1/00071003',
    approvalStatus: 'approved',
    addressLine1: 'Unit 7, Riverside Estate',
    townOrCity: 'Spalding',
    postcode: 'PE11 2RB',
    country: UNITED_KINGDOM,
    deleted: false
  },
  {
    id: 'iberia-cold-chain-sl',
    name: 'Iberia Cold Chain SL',
    transporterType: 'commercial',
    approvalNumber: 'ES/VALENCIA/T1/00061004',
    approvalStatus: 'approved',
    addressLine1: 'Calle del Puerto 8',
    townOrCity: 'Valencia',
    postcode: '46024',
    country: 'Spain',
    deleted: false
  },
  {
    id: 'fenland-growers-transport',
    name: 'Fenland Growers Transport',
    transporterType: 'private',
    approvalNumber: 'UK/CAMBRIDGESHIRE/T1/00051005',
    approvalStatus: 'approved',
    addressLine1: 'Low Road Farm',
    townOrCity: 'Wisbech',
    postcode: 'PE14 0SP',
    country: UNITED_KINGDOM,
    deleted: false
  },
  {
    id: 'alpenrose-logistik-gmbh',
    name: 'Alpenrose Logistik GmbH',
    transporterType: 'commercial',
    approvalNumber: 'AT/SALZBURG/T1/00041006',
    approvalStatus: 'new',
    addressLine1: 'Industriestrasse 3',
    townOrCity: 'Salzburg',
    postcode: '5020',
    country: 'Austria',
    deleted: false
  },
  {
    id: 'copperfield-couriers',
    name: 'Copperfield Couriers',
    transporterType: 'private',
    approvalNumber: 'UK/KENT/T1/00031007',
    approvalStatus: 'new',
    addressLine1: '22 Station Approach',
    townOrCity: 'Ashford',
    postcode: 'TN23 1EZ',
    country: UNITED_KINGDOM,
    deleted: false
  }
])

/** The messages the API would send for each field it refuses. */
const MESSAGES = Object.freeze({
  name: 'Enter the transporter’s name',
  transporterType: 'Select the type of transporter',
  addressLine1: 'Enter address line 1',
  townOrCity: 'Enter the town or city',
  country: 'Enter the country'
})

const store = createFakeStore({
  name: 'transporters',
  starters: STARTER_TRANSPORTERS
})

const text = (body, field) => String(body?.[field] ?? '').trim()

const searchable = (row) => [
  row.name,
  row.addressLine1,
  row.townOrCity,
  row.postcode,
  row.country,
  row.approvalNumber
]

/** The API's validation: each missing field, and a type it does not know. */
const problemFor = (body) => {
  const errors = {}
  for (const [field, message] of Object.entries(MESSAGES)) {
    if (!text(body, field)) {
      errors[field] = [message]
    }
  }
  if (
    !errors.transporterType &&
    !TRANSPORTER_TYPES.includes(body.transporterType)
  ) {
    errors.transporterType = [MESSAGES.transporterType]
  }
  return Object.keys(errors).length > 0
    ? { detail: 'Validation failed', errors }
    : null
}

export const listTransporters = async (
  orgId,
  { search = '', page = 1 } = {}
) => {
  const found = searchRecords(store.visible(orgId), searchable, {
    query: search,
    page
  })
  return { ...found, results: found.results.map(toRecord) }
}

export const getTransporter = async (orgId, id) => {
  const row = store.find(orgId, id)
  return row ? toRecord(row) : undefined
}

export const createTransporter = async (orgId, body = {}) => {
  const problem = problemFor(body)
  if (problem) {
    throw validationError(problem)
  }
  const row = store.add(orgId, {
    id: idFromName(text(body, 'name'), store.takenIds(orgId)),
    name: text(body, 'name'),
    transporterType: body.transporterType,
    approvalNumber: text(body, 'approvalNumber'),
    approvalStatus: 'new',
    addressLine1: text(body, 'addressLine1'),
    townOrCity: text(body, 'townOrCity'),
    postcode: text(body, 'postcode'),
    country: text(body, 'country'),
    deleted: false
  })
  return toRecord(row)
}

export const deleteTransporter = async (orgId, id) => store.remove(orgId, id)
