import { copyFor } from '../../../../../../../shared/copy.js'
import { REFERENCE_PARTIES } from '../../../parties/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

/**
 * Only a previously answered role whose saved reference no longer resolves
 * needs correction. A role never answered displays Not provided without error.
 */
export const outstandingPartyErrors = (answers = {}, parties = answers) =>
  Object.fromEntries(
    REFERENCE_PARTIES.filter(
      (field) => answers[field]?.addressId && !parties[field]
    ).map((field) => [field, copy.errors.parties[field]])
  )
