/**
 * Reads one Sass file from a design release's assets: what it loads, which
 * rules reach beyond the release's own classes, which colours are written
 * by hand, and which selectors name the shared header, navigation, phase
 * banner or footer.
 */
import postcssScss from 'postcss-scss'

import { CHROME_CLASS } from './release-chrome.js'

const isAtRoot = (node) => node.type === 'atrule' && node.name === 'at-root'

const isDefinition = (node) =>
  node.type === 'atrule' && ['mixin', 'function'].includes(node.name)

const isInsideDefinition = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isDefinition(parent)) {
      return true
    }
  }
  return false
}

const isInsideRuleOrDefinition = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (isAtRoot(parent)) {
      return parent.params.trim() !== ''
    }
    if (parent.type === 'rule' || isDefinition(parent)) {
      return true
    }
  }
  return false
}

const enclosingRuleSelector = (node) => {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (parent.type === 'rule') {
      return parent.selectors[0]
    }
  }
  return ''
}

const isPlaceholder = (selector) => selector.startsWith('%')

const withoutBracketedArguments = (selector) => {
  let stripped = selector
  while (/\([^()]*\)/.test(stripped)) {
    stripped = stripped.replaceAll(/\([^()]*\)/g, '')
  }
  return stripped
}

const firstCompound = (selector) =>
  withoutBracketedArguments(selector)
    .trim()
    .split(/\s*[\s>+~]\s*/)[0]

const isScopedTo = (selector, classPrefix) =>
  isPlaceholder(selector) || firstCompound(selector).includes(`.${classPrefix}`)

/**
 * @param {string} source - the Sass text.
 * @param {{ classPrefix: string }} options - the release's class prefix,
 * `app-<release>-`.
 * @returns {{ loads: string[], strayRules: string[], rawColours: string[], chromeSelectors: string[] }}
 * `loads` is every `@use`, `@forward` and `@import` path; `strayRules` every
 * top-level or `@at-root` selector whose first part, outside any brackets,
 * holds no class with the release's prefix; `rawColours` every value
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

  const strayIn = (node, selectors) => {
    const outer = enclosingRuleSelector(node)
    return selectors
      .map((selector) => selector.replaceAll('&', outer))
      .filter((selector) => !isScopedTo(selector, classPrefix))
  }

  sheet.walkAtRules((rule) => {
    const loaded =
      loadRules.has(rule.name) && /["']([^"']+)["']/.exec(rule.params)
    if (loaded) {
      loads.push(loaded[1])
    }
    if (isAtRoot(rule) && rule.params.trim() !== '') {
      const selectors = rule.params
        .split(',')
        .map((selector) => selector.trim())
      chromeSelectors.push(...selectors.filter((s) => CHROME_CLASS.test(s)))
      if (!isInsideDefinition(rule)) {
        strayRules.push(...strayIn(rule, selectors))
      }
    }
  })
  sheet.walkRules((rule) => {
    const selectors = rule.selectors.map((selector) => selector.trim())
    chromeSelectors.push(...selectors.filter((s) => CHROME_CLASS.test(s)))
    if (!isInsideRuleOrDefinition(rule)) {
      strayRules.push(...strayIn(rule, selectors))
    }
  })
  sheet.walkDecls((declaration) => {
    if (rawColour.test(declaration.value)) {
      rawColours.push(`${declaration.prop}: ${declaration.value}`)
    }
  })
  return { loads, strayRules, rawColours, chromeSelectors }
}
