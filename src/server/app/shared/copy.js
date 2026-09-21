const DEFAULT_LOCALE = 'en'

/**
 * Resolve a feature's copy module for a locale, falling back to English.
 *
 * The i18n seam: each feature owns `copy.<locale>.js` modules beside its
 * controller and passes them here as `{ en, cy, ... }`. Both locale bundles
 * exist and `copy-parity.test.js` keeps them structure-identical; every
 * `copy.cy.js` is machine-draft Welsh awaiting translator sign-off. Every
 * call site resolves `en` because no locale toggle is wired yet — locale
 * selection (cookie, language toggle) plugs in via the `locale` argument.
 *
 * @param {Record<string, object>} locales - copy modules keyed by locale.
 * @param {string} [locale=en] - the locale to resolve.
 * @returns {object} the locale's copy module, or English when unknown.
 */
export const copyFor = (locales, locale = DEFAULT_LOCALE) =>
  locales[locale] ?? locales[DEFAULT_LOCALE]
