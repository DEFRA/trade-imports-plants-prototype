import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { readOnlyRow } from './summary-row.js'
import { valueText } from './value-text.js'

const copy = copyFor({ en, cy })

const escapeHtml = (value) =>
  value
    .toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** A summary list has no error state of its own, so the message sits in the
 * value cell with the markup govukErrorMessage gives a form field. */
const errorMarkup = (message) =>
  '<p class="govuk-error-message">' +
  `<span class="govuk-visually-hidden">${escapeHtml(copy.errorPrefix)}</span> ` +
  `${escapeHtml(message)}</p>`

/** A read-only row that shows, above its value, each rule the value breaks. */
export const errorRow = (key, value, messages) =>
  messages.length === 0
    ? readOnlyRow(key, value)
    : {
        key: { text: key },
        value: {
          html:
            messages.map(errorMarkup).join('') + escapeHtml(valueText(value))
        }
      }
