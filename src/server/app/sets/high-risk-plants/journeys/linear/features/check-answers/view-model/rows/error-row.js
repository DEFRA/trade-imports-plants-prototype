import { copyFor } from '../../../../../../../../shared/copy.js'
import { escapeHtml } from '../../../../../../../../../../shared/escape-html.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { readOnlyRow } from './summary-row.js'
import { valueText } from './value-text.js'

const copy = copyFor({ en, cy })

const errorMarkup = (message) =>
  '<p class="govuk-error-message">' +
  `<span class="govuk-visually-hidden">${escapeHtml(copy.errorPrefix)}</span> ` +
  `${escapeHtml(message)}</p>`

const htmlRow = (key, messages, valueHtml) => ({
  key: { text: key },
  value: { html: messages.map(errorMarkup).join('') + valueHtml }
})

/**
 * A read-only row for one value that shows, above it, each rule the value
 * breaks.
 *
 * @param {string} key - the row's label.
 * @param {string|number|null|undefined} value - the single value shown.
 * @param {string[]} messages - the rules the value breaks.
 * @returns {object} the summary list row.
 */
export const errorRow = (key, value, messages) =>
  messages.length === 0
    ? readOnlyRow(key, value)
    : htmlRow(key, messages, escapeHtml(valueText(value)))

/**
 * A read-only row for a list of lines that shows, above them, each rule the
 * lines break.
 *
 * @param {string} key - the row's label.
 * @param {string[]|null|undefined} lines - shown one per line; an empty or
 * absent list shows as not provided.
 * @param {string[]} messages - the rules the lines break.
 * @returns {object} the summary list row.
 */
export const errorLinesRow = (key, lines, messages) => {
  if (lines?.length > 0) {
    return htmlRow(key, messages, lines.map(escapeHtml).join('<br>'))
  }
  return errorRow(key, null, messages)
}
