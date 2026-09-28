import { readFileSync } from 'node:fs'

import { camelCase, screamingSnakeCase } from '../../new-set/names.js'

/**
 * The four files `designer:service new` writes, from the templates beside
 * this file. Pure string work: the CLI writes and formats them.
 */

/**
 * Who would own the real service, as `--owner` names it: the backend
 * repo that would build it (or `new-api` when none exists yet), its base
 * URL env var and default local port, and whether its API takes the
 * organisation in the URL path (`address-book`, `new-api`) or only in the
 * `Trade-Imports-Organisation-Id` header, with a flat path (every other
 * owner — the shape `templates` and `notification-search` already use on
 * `plants-backend`).
 */
export const OWNERS = Object.freeze([
  Object.freeze({
    id: 'plants-backend',
    repo: 'trade-imports-plants-backend',
    baseUrlEnv: 'TRADE_IMPORTS_PLANTS_BACKEND_URL',
    defaultPort: 8091,
    pathStyle: 'org-header'
  }),
  Object.freeze({
    id: 'address-book',
    repo: 'trade-imports-address-book',
    baseUrlEnv: 'TRADE_IMPORTS_ADDRESS_BOOK_URL',
    defaultPort: 8089,
    pathStyle: 'org-path'
  }),
  Object.freeze({
    id: 'reference-data',
    repo: 'trade-imports-reference-data',
    baseUrlEnv: 'TRADE_IMPORTS_REFERENCE_DATA_URL',
    defaultPort: 8086,
    pathStyle: 'org-header'
  }),
  Object.freeze({
    id: 'ins-backend',
    repo: 'trade-imports-ins-backend',
    baseUrlEnv: 'TRADE_IMPORTS_INS_BACKEND_URL',
    defaultPort: 8090,
    pathStyle: 'org-header'
  }),
  Object.freeze({
    id: 'dynamics-gateway',
    repo: 'trade-imports-dynamics-gateway',
    baseUrlEnv: 'TRADE_IMPORTS_DYNAMICS_GATEWAY_URL',
    defaultPort: 8088,
    pathStyle: 'org-header'
  }),
  Object.freeze({
    id: 'new-api',
    repo: null,
    baseUrlEnv: null,
    defaultPort: 8099,
    pathStyle: 'org-path'
  })
])

/** Just the ids, for `--owner`'s allow-list and its refusal message. */
export const OWNER_IDS = Object.freeze(OWNERS.map((owner) => owner.id))

const ownerRecord = (id) => OWNERS.find((owner) => owner.id === id)

const TEMPLATES = Object.freeze({
  'index.js': 'index.js.tmpl',
  'client.js': 'client.js.tmpl',
  'stub.js': 'stub.js.tmpl',
  'contract.json': 'contract.json.tmpl',
  test: 'service.test.js.tmpl'
})

const read = (file) =>
  readFileSync(new URL(`./templates/${file}`, import.meta.url), 'utf8')

const capitalise = (word) => word.charAt(0).toUpperCase() + word.slice(1)

/** `saved-vehicles` → `SavedVehicles`, for `listSavedVehicles`. */
export const pluralName = (name) => capitalise(camelCase(name))

/** `saved-vehicles` → `SavedVehicle`, for `getSavedVehicle`. A name that is
 * not plural is used as it is. */
export const singularName = (name) => {
  const plural = pluralName(name)
  if (plural.endsWith('ies')) {
    return `${plural.slice(0, -'ies'.length)}y`
  }
  if (plural.endsWith('s') && !plural.endsWith('ss')) {
    return plural.slice(0, -1)
  }
  return plural
}

/**
 * The words that differ between one generated service and another.
 *
 * @param {{ name: string, owner: string, describe: string }} service
 * @returns {Record<string, string>} each token and what replaces it.
 */
export const tokensFor = ({ name, owner, describe }) => {
  const found = ownerRecord(owner)
  const orgInPath = (found?.pathStyle ?? 'org-path') === 'org-path'
  const env =
    found?.baseUrlEnv ?? `TRADE_IMPORTS_${screamingSnakeCase(name)}_URL`
  const defaultUrl = `http://localhost:${found?.defaultPort ?? 8099}`
  const title = name.split('-').join(' ')
  return {
    __NAME__: name,
    __TITLE__: title,
    __OWNER__: owner,
    __ENV__: env,
    __PLURAL__: pluralName(name),
    __SINGULAR__: singularName(name),
    __NEEDS__: JSON.stringify(describe.trim()),
    __DEFAULT_URL__: defaultUrl,
    __CONTRACT_PATH__: orgInPath
      ? `/organisation/{organisationId}/${name}`
      : `/${name}`,
    __COLLECTION_URL__: orgInPath
      ? `\`\${serviceUrl}/organisation/\${encodeURIComponent(orgId)}/${name}\``
      : `\`\${serviceUrl}/${name}\``,
    __EXPECTED_COLLECTION__: orgInPath
      ? `\`\${SERVICE_URL}/organisation/\${ORG}/${name}\``
      : `\`\${SERVICE_URL}/${name}\``
  }
}

const fill = (template, tokens) =>
  Object.entries(tokens).reduce(
    (text, [token, value]) => text.replaceAll(token, value),
    template
  )

/**
 * The files for a new service, by file name inside its folder.
 *
 * @param {{ name: string, owner: string, describe: string }} service
 * @returns {Record<string, string>} `index.js`, `client.js`, `stub.js` and
 * `<name>.test.js`, each with its content.
 */
export const filesFor = (service) => {
  const tokens = tokensFor(service)
  return Object.fromEntries(
    Object.entries(TEMPLATES).map(([file, template]) => [
      file === 'test' ? `${service.name}.test.js` : file,
      fill(read(template), tokens)
    ])
  )
}
