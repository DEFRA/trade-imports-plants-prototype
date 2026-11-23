import { nunjucksConfig } from '../../../config/nunjucks/nunjucks.js'

const environment = nunjucksConfig.options.compileOptions.environment

const exportedMacrosOf = (template) => {
  let exported
  environment.getTemplate(template, true).getExported((err, macros) => {
    if (err) {
      throw err
    }
    exported = macros
  })
  return exported
}

/**
 * Loads a template once and gives its macros as functions rendering to HTML,
 * for table cells that need a GOV.UK component.
 *
 * @param {string} template - the template path the macros are defined in.
 * @returns {Record<string, (...macroArguments: unknown[]) => string>}
 */
export const templateMacros = (template) =>
  Object.fromEntries(
    Object.entries(exportedMacrosOf(template)).map(([name, macro]) => [
      name,
      (...macroArguments) => String(macro(...macroArguments))
    ])
  )
