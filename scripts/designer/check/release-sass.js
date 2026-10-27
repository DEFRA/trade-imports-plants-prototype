/**
 * Reads one Sass file from a design release's assets: what it loads, which
 * rules reach beyond the release's own classes, which colours are written
 * by hand, and which selectors name the shared header, navigation, phase
 * banner or footer.
 */
import postcssScss from 'postcss-scss'

import { CHROME_CLASS } from './release-chrome.js'

const isInsideRuleOrDefinition = (node) => {
  const definitions = new Set(['mixin', 'function'])
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'rule') {
      return true
    }
    if (parent.type === 'atrule' && definitions.has(parent.name)) {
      return true
    }
  }
  return false
}

const isPlaceholder = (selector) => selector.startsWith('%')

/**
 * @param {string} source - the Sass text.
 * @param {{ classPrefix: string }} options - the release's class prefix,
 * `app-<release>-`.
 * @returns {{ loads: string[], strayRules: string[], rawColours: string[], chromeSelectors: string[] }}
 * `loads` is every `@use`, `@forward` and `@import` path; `strayRules` every
 * top-level selector without the release's prefix; `rawColours` every value
 * holding a hex, rgb() or hsl() colour; `chromeSelectors` every selector
 * naming shared chrome.
 */
export const readReleaseSass = (source, { classPrefix }) => {
  const loadRules = new Set(['use', 'forward', 'import'])
  const rawColour = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\(/i
  const sheet = postcssScss.parse(source)
  const loads = []
  const strayRules = []
  const rawColours = []
  const chromeSelectors = []

  sheet.walkAtRules((rule) => {
    const loaded =
      loadRules.has(rule.name) && /["']([^"']+)["']/.exec(rule.params)
    if (loaded) {
      loads.push(loaded[1])
    }
  })
  sheet.walkRules((rule) => {
    const selectors = rule.selectors.map((selector) => selector.trim())
    chromeSelectors.push(...selectors.filter((s) => CHROME_CLASS.test(s)))
    if (isInsideRuleOrDefinition(rule)) {
      return
    }
    strayRules.push(
      ...selectors.filter(
        (selector) =>
          !isPlaceholder(selector) && !selector.includes(`.${classPrefix}`)
      )
    )
  })
  sheet.walkDecls((declaration) => {
    if (rawColour.test(declaration.value)) {
      rawColours.push(`${declaration.prop}: ${declaration.value}`)
    }
  })
  return { loads, strayRules, rawColours, chromeSelectors }
}
