/**
 * Reads one script from a design release's assets: what it imports, which
 * GOV.UK and MoJ components it switches on, whether it does anything beyond
 * switching them on, and whether it names the shared chrome.
 */
import * as espree from 'espree'

import { CHROME_NAME } from './release-chrome.js'
import { componentKey } from './release-loads.js'

const importedNames = (declaration) =>
  declaration.specifiers
    .filter((specifier) => specifier.type === 'ImportSpecifier')
    .map((specifier) => specifier.imported.name)

const isSwitchOnCall = (statement) =>
  statement.type === 'ExpressionStatement' &&
  statement.expression.type === 'CallExpression' &&
  statement.expression.callee.type === 'Identifier' &&
  statement.expression.callee.name === 'createAll'

const sourceOf = (statement) =>
  statement.type === 'ImportDeclaration' ||
  statement.type === 'ExportAllDeclaration' ||
  (statement.type === 'ExportNamedDeclaration' && statement.source)
    ? statement.source.value
    : undefined

/**
 * @param {string} source - the script's text.
 * @returns {{ imports: string[], components: string[], switchesOnAll: boolean, onlySwitchesOn: boolean, namesChrome: boolean, parseError?: string }}
 * `components` holds each GOV.UK or MoJ component imported, as
 * `componentKey` writes it; `switchesOnAll` is true when it imports
 * `initAll`; `onlySwitchesOn` is true when it does nothing but import and
 * call `createAll`.
 */
export const readReleaseScript = (source) => {
  let program
  try {
    program = espree.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module'
    })
  } catch (error) {
    return {
      imports: [],
      components: [],
      switchesOnAll: false,
      onlySwitchesOn: false,
      namesChrome: CHROME_NAME.test(source),
      parseError: error.message
    }
  }
  const libraries = new Map([
    ['govuk-frontend', 'govuk'],
    ['@ministryofjustice/frontend', 'moj']
  ])
  const imports = program.body.map(sourceOf).filter(Boolean)
  const fromLibraries = program.body
    .filter(
      (statement) =>
        statement.type === 'ImportDeclaration' &&
        libraries.has(statement.source.value)
    )
    .flatMap((declaration) =>
      importedNames(declaration).map((name) => ({
        library: libraries.get(declaration.source.value),
        name
      }))
    )
  return {
    imports,
    components: fromLibraries
      .filter(({ name }) => /^[A-Z]/.test(name))
      .map(({ library, name }) => componentKey(library, name)),
    switchesOnAll: fromLibraries.some(({ name }) => name === 'initAll'),
    onlySwitchesOn: program.body.every(
      (statement) =>
        statement.type === 'ImportDeclaration' || isSwitchOnCall(statement)
    ),
    namesChrome: CHROME_NAME.test(source)
  }
}
