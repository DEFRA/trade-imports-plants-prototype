/**
 * The classes of the header, service navigation, phase banner, skip link and
 * footer that every set shares. A design release's styles and scripts never
 * reach them.
 */
const CHROME_BLOCKS = [
  'govuk-header',
  'govuk-service-navigation',
  'govuk-phase-banner',
  'govuk-skip-link',
  'govuk-footer',
  'app-header',
  'app-service-header'
]

const BLOCKS = CHROME_BLOCKS.join('|')

/** A selector naming a shared-chrome class, or one of its elements. */
export const CHROME_CLASS = new RegExp(`\\.(?:${BLOCKS})(?![a-z0-9])`)

/** A shared-chrome class name anywhere in a script's text. */
export const CHROME_NAME = new RegExp(`(?<![\\w-])(?:${BLOCKS})(?![a-z0-9])`)
