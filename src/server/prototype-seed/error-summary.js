/**
 * Reads what a refused page told the person filling it in: the messages in its
 * GOV.UK error summary, or failing that its main heading.
 *
 * Plain string handling rather than an HTML parser, because this runs in the
 * deployed prototype too, where only the production dependencies are
 * installed. The error summary's markup is fixed by the govuk-frontend macro
 * every page renders it through (`shared/error-summary.njk`).
 */

const ENTITIES = Object.freeze({
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&nbsp;': ' '
})

const HEX_PREFIX = '&#x'
const DECIMAL_PREFIX = '&#'
const HEX = 16
const DECIMAL = 10

const codePointOf = (entity) =>
  entity.startsWith(HEX_PREFIX)
    ? Number.parseInt(entity.slice(HEX_PREFIX.length, -1), HEX)
    : Number.parseInt(entity.slice(DECIMAL_PREFIX.length, -1), DECIMAL)

const decode = (text) =>
  text.replaceAll(/&(?:#x?[\da-f]+|[a-z]+);/gi, (entity) => {
    const known = ENTITIES[entity.toLowerCase()]
    if (known) {
      return known
    }
    const code = codePointOf(entity)
    return Number.isNaN(code) ? entity : String.fromCodePoint(code)
  })

/** Each tag becomes a space: split at `<`, and drop each piece up to its `>`. */
const withoutTags = (html) =>
  html
    .split('<')
    .map((piece, index) =>
      index === 0 ? piece : piece.slice(piece.indexOf('>') + 1)
    )
    .join(' ')

const textOf = (html) =>
  decode(withoutTags(html)).replaceAll(/\s+/g, ' ').trim()

const LIST_START = 'govuk-error-summary__list'
const LIST_END = '</ul>'

/**
 * Every message in the page's error summary, in the order the page lists them.
 *
 * @param {string} html - the page's HTML.
 * @returns {string[]} the messages, empty when the page has no error summary.
 */
export const errorSummaryMessages = (html) => {
  if (typeof html !== 'string') {
    return []
  }
  const start = html.indexOf(LIST_START)
  if (start === -1) {
    return []
  }
  const end = html.indexOf(LIST_END, start)
  const list = html.slice(html.indexOf('>', start) + 1, end)
  return list
    .split(/<li[^>]*>/)
    .map((item) => textOf(item))
    .filter((text) => text !== '')
}

/**
 * The page's main heading, for a refusal with no error summary (the service's
 * own "Sorry, there is a problem" page, for example).
 *
 * @param {string} html - the page's HTML.
 * @returns {string|undefined} the heading text.
 */
export const mainHeading = (html) => {
  if (typeof html !== 'string') {
    return undefined
  }
  const open = html.indexOf('<h1')
  const close = html.indexOf('</h1>', open)
  if (open === -1 || close === -1) {
    return undefined
  }
  const text = textOf(html.slice(html.indexOf('>', open) + 1, close))
  return text === '' ? undefined : text
}

/**
 * What the page said, in one line: every error summary message joined, else
 * the heading, else the status code.
 *
 * @param {{ statusCode: number, payload?: string }} response - the injected
 * response.
 * @returns {string} the message to show a designer.
 */
export const whatThePageSaid = (response) => {
  const messages = errorSummaryMessages(response.payload)
  if (messages.length > 0) {
    return messages.join('; ')
  }
  const heading = mainHeading(response.payload)
  return heading
    ? `${heading} (${response.statusCode})`
    : `nothing, it answered ${response.statusCode}`
}
