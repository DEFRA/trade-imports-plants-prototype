import { readFileSync } from 'node:fs'

import { camelCase, screamingSnakeCase } from '../../new-set/names.js'

/**
 * The four files `designer:service new` writes, from the templates beside
 * this file. Pure string work: the CLI writes and formats them.
 */

/** Who would own the real service, as `--owner` names it. */
export const OWNERS = Object.freeze(['plants-backend', 'new-api', 'ins'])

const PLANTS_BACKEND_ENV = 'TRADE_IMPORTS_PLANTS_BACKEND_URL'
const PLANTS_BACKEND_URL = 'http://localhost:8091'
const NEW_SERVICE_URL = 'http://localhost:8099'

const TEMPLATES = Object.freeze({
  'index.js': 'index.js.tmpl',
  'client.js': 'client.js.tmpl',
  'stub.js': 'stub.js.tmpl',
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
  const onPlantsBackend = owner === 'plants-backend'
  const env = onPlantsBackend
    ? PLANTS_BACKEND_ENV
    : `TRADE_IMPORTS_${screamingSnakeCase(name)}_URL`
  const title = name.split('-').join(' ')
  return {
    __NAME__: name,
    __TITLE__: title,
    __OWNER__: owner,
    __ENV__: env,
    __PLURAL__: pluralName(name),
    __SINGULAR__: singularName(name),
    __NEEDS__: JSON.stringify(describe.trim()),
    __DEFAULT_URL__: onPlantsBackend ? PLANTS_BACKEND_URL : NEW_SERVICE_URL,
    __CONTRACT_PATH__: onPlantsBackend
      ? `/${name}`
      : `/organisation/{organisationId}/${name}`,
    __COLLECTION_URL__: onPlantsBackend
      ? `\`\${serviceUrl}/${name}\``
      : `\`\${serviceUrl}/organisation/\${encodeURIComponent(orgId)}/${name}\``,
    __EXPECTED_COLLECTION__: onPlantsBackend
      ? `\`\${SERVICE_URL}/${name}\``
      : `\`\${SERVICE_URL}/organisation/\${ORG}/${name}\``
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
