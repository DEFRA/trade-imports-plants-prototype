import { copyFor } from '../../../../../../../shared/copy.js'
import { addressBookCountries } from '../../../../../../../services/countries/index.js'
import { PARTIES } from '../../../parties/index.js'
import { partyFieldErrors } from '../../party-edit/address-rules.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const hasAny = (errors) => Object.keys(errors).length > 0

/** For each role whose copy breaks the address book's rules, the fields that
 * break them. An unanswered role is not an error: the user has not had a chance
 * to answer. */
export const invalidPartyFields = async (answers, scope) => {
  const answered = PARTIES.filter(
    (party) => scope.has(party.id) && answers[party.id]
  )
  if (answered.length === 0) {
    return {}
  }
  const countryCodes = (await addressBookCountries()).map(({ code }) => code)
  return Object.fromEntries(
    answered
      .map((party) => [
        party.id,
        partyFieldErrors(answers[party.id], countryCodes)
      ])
      .filter(([, fieldErrors]) => hasAny(fieldErrors))
  )
}

/** One summary message per role in error. */
export const invalidPartyErrors = (fieldErrorsById) =>
  Object.fromEntries(
    Object.keys(fieldErrorsById).map((id) => [id, copy.errors.parties[id]])
  )
