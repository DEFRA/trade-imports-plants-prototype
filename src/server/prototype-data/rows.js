import { fromRow } from '../app/services/address-book/stub/from-row.js'
import { STUB_BOOK } from '../app/services/address-book/stub/index.js'
import { PORTS } from '../app/services/ports/stub.js'
import { COUNTRY_LABELS } from '../app/services/countries/stub.js'

/**
 * The three kinds of extra row a designer can add, each checked against the
 * shape the matching stub service already serves, so nothing downstream can
 * tell an extra row from a stub one.
 *
 * Every check returns plain-English problems rather than throwing, so one run
 * reports every mistake in a file at once.
 */

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

const PARTY_FIELDS = Object.freeze([
  'id',
  'name',
  'addressLine1',
  'townOrCity',
  'postalOrZipCode',
  'country',
  'telephoneNumber',
  'emailAddress'
])
const PARTY_REQUIRED = Object.freeze([
  'id',
  'name',
  'addressLine1',
  'townOrCity',
  'country'
])
const CODE_AND_NAME = Object.freeze(['code', 'name'])

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const unknownFields = (row, allowed) =>
  Object.keys(row).filter((key) => !allowed.includes(key))

const rowProblems = (row, { allowed, required }) => {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) {
    return ['is not a { ... } object']
  }
  const problems = required
    .filter((field) => !isText(row[field]))
    .map((field) => `has no '${field}'`)
  for (const field of unknownFields(row, allowed)) {
    problems.push(
      `has a field called '${field}', which is not one of ${allowed.join(', ')}`
    )
  }
  return problems
}

const partyProblems = (row) => {
  const problems = rowProblems(row, {
    allowed: PARTY_FIELDS,
    required: PARTY_REQUIRED
  })
  if (problems.length > 0) {
    return problems
  }
  if (!ID_PATTERN.test(row.id)) {
    problems.push(
      `has the id '${row.id}': use lower-case words joined by hyphens, like 'green-leaf-imports-ltd'`
    )
  }
  if (Object.values(row).some((value) => String(value).includes('|'))) {
    problems.push("uses the '|' character, which an address cannot contain")
  }
  return problems
}

const portProblems = (row) =>
  rowProblems(row, { allowed: CODE_AND_NAME, required: CODE_AND_NAME })

const countryProblems = (row) => {
  const problems = rowProblems(row, {
    allowed: CODE_AND_NAME,
    required: CODE_AND_NAME
  })
  if (problems.length === 0 && !COUNTRY_CODE_PATTERN.test(row.code)) {
    problems.push(
      `has the code '${row.code}': a country code is two capital letters, like 'CY'`
    )
  }
  return problems
}

/**
 * Turns a designer's party row into the exact record the stub address book
 * serves, through the stub's own `fromRow`, then lays the optional contact
 * details over the stub's defaults.
 */
const toPartyRecord = (row) => {
  const record = fromRow(
    [
      row.id,
      row.name,
      row.addressLine1,
      row.townOrCity,
      row.postalOrZipCode ?? '',
      row.country
    ].join('|')
  )
  return {
    ...record,
    address: {
      ...record.address,
      ...(isText(row.telephoneNumber) && {
        telephoneNumber: row.telephoneNumber
      }),
      ...(isText(row.emailAddress) && { emailAddress: row.emailAddress })
    }
  }
}

const toCodeAndName = (row) => ({ code: row.code, name: row.name })

/**
 * One entry per kind: the file it lives in, how to check and shape a row,
 * what a stub row is keyed by, and an example row for error messages.
 */
export const KINDS = Object.freeze({
  parties: {
    file: 'parties.json',
    problems: partyProblems,
    toRow: toPartyRecord,
    keyOf: (row) => row.id,
    stubKeys: () => STUB_BOOK.map((record) => record.id),
    example:
      '{ "id": "green-leaf-imports-ltd", "name": "Green Leaf Imports Ltd", "addressLine1": "5 Quay Street", "townOrCity": "Bristol", "postalOrZipCode": "BS1 4DJ", "country": "United Kingdom" }'
  },
  ports: {
    file: 'ports.json',
    problems: portProblems,
    toRow: toCodeAndName,
    keyOf: (row) => row.code,
    stubKeys: () => PORTS.map((port) => port.code),
    example: '{ "code": "GB XPT", "name": "Example Port" }'
  },
  countries: {
    file: 'countries.json',
    problems: countryProblems,
    toRow: toCodeAndName,
    keyOf: (row) => row.code,
    stubKeys: () => Object.keys(COUNTRY_LABELS),
    example: '{ "code": "XK", "name": "Kosovo" }'
  }
})

/**
 * Every problem with one overlay file's rows, each naming the file and row.
 *
 * @param {string} kind - `parties`, `ports` or `countries`.
 * @param {unknown} rows - the parsed file.
 * @param {string} where - the file's path, as the designer would name it.
 * @param {Set<string>} [taken] - keys already used by the stub or by an
 * earlier overlay file, so a duplicate is caught across files too.
 * @returns {string[]} the problems, empty when every row is fine.
 */
export const overlayProblems = (kind, rows, where, taken = new Set()) => {
  const spec = KINDS[kind]
  if (!Array.isArray(rows)) {
    return [
      `${where} must be a list in square brackets, like [ ${spec.example} ]`
    ]
  }
  const problems = []
  const seen = new Set(taken)
  rows.forEach((row, index) => {
    const label = `${where} row ${index + 1}`
    const found = spec.problems(row)
    for (const problem of found) {
      problems.push(`${label} ${problem}. A row looks like ${spec.example}`)
    }
    if (found.length > 0) {
      return
    }
    const key = spec.keyOf(row)
    if (seen.has(key)) {
      problems.push(
        `${label} uses '${key}', which already exists. Give it a different ${kind === 'parties' ? 'id' : 'code'}`
      )
    }
    seen.add(key)
  })
  return problems
}
