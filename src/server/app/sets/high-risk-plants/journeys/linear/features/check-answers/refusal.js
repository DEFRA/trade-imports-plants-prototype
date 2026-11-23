import { originErrors } from '../origin/controller.js'
import {
  invalidPartyErrors,
  invalidPartyFields
} from './view-model/invalid-parties.js'

export const reviewErrors = async (current) => {
  const partyFieldErrorsById = await invalidPartyFields(
    current.answers,
    current.scope
  )
  return {
    answerErrors: (await originErrors(current)) ?? {},
    partyErrors: invalidPartyErrors(partyFieldErrorsById),
    partyFieldErrorsById
  }
}

const hasAny = (errors) => Object.keys(errors).length > 0

/** Shared by Review's Continue and the declaration's submit, so a bookmark or
 * the back button cannot submit what Review would refuse. */
export const isReviewRefused = async (current) => {
  const { answerErrors, partyErrors } = await reviewErrors(current)
  return hasAny(answerErrors) || hasAny(partyErrors)
}
