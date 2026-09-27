import {
  isKnownJourney,
  replaceJourneyFulfilment,
  startJourney
} from '../../app/engine/journey.js'
import { records } from '../../app/engine/persistence/records.js'
import { organisationIdOf } from '../../common/helpers/organisation-id.js'
import { saveTemplate, template } from './index.js'

/**
 * Saves one of the user's notifications as a template.
 *
 * Only a notification this browser knows (one the user started, or opened
 * from their dashboard) can be saved, the same rule the engine applies to
 * copy and delete.
 *
 * @param {object} request - the Hapi request, inside the release's routes.
 * @param {string} journeyId - the notification's reference number.
 * @param {string} name - the name the user gave the template.
 * @returns {Promise<object|undefined>} the saved template, or undefined when
 * the notification is not the user's or no longer exists.
 */
export const saveJourneyAsTemplate = async (request, journeyId, name) => {
  if (!(await isKnownJourney(request, journeyId))) {
    return undefined
  }
  const journey = await records.load({ journeyId })
  if (!journey) {
    return undefined
  }
  return saveTemplate(organisationIdOf(request), {
    name,
    fulfilment: journey.fulfilment,
    fromJourneyId: journeyId
  })
}

/**
 * Starts a new draft notification from a template: a new reference number,
 * added to the user's dashboard, with the template's answers already filled
 * in. Send the user to the task list (`hubPath(journey.journeyId)`) next.
 *
 * @param {object} request - the Hapi request, inside the release's routes.
 * @param {object} h - the Hapi response toolkit.
 * @param {string} templateId - the template to start from.
 * @returns {Promise<object|undefined>} the new draft, or undefined when the
 * organisation has no such template.
 */
export const startFromTemplate = async (request, h, templateId) => {
  const chosen = await template(organisationIdOf(request), templateId)
  if (!chosen) {
    return undefined
  }
  const journey = await startJourney(request, h)
  return replaceJourneyFulfilment(
    request,
    journey.journeyId,
    structuredClone(chosen.fulfilment)
  )
}
