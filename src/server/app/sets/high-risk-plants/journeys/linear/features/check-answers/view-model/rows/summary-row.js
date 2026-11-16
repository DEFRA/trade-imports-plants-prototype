import { changeAction, editableActions } from './change-link.js'
import { valueText } from './value-text.js'

export const row = (
  { journeyId, changeLinkTrail, readOnly },
  key,
  value,
  obligationId,
  visuallyHiddenText = null
) => ({
  key: { text: key },
  value: { text: valueText(value) },
  ...editableActions({
    readOnly,
    actions: changeAction(
      { journeyId, changeLinkTrail },
      obligationId,
      visuallyHiddenText ?? key.toLowerCase()
    )
  })
})

export const readOnlyRow = (key, value) => ({
  key: { text: key },
  value: { text: valueText(value) }
})
