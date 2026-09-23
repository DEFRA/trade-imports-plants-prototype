import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { makeLoadWritable } from '../store/writable.js'
import { marshal } from '../marshal/document.js'

export const makeFinalise = (store) => {
  const loadWritable = makeLoadWritable(store)
  return async (journeyId, _actor) => {
    const journey = loadWritable(journeyId)
    journey.status = SUBMITTED
    journey.submittedAt = new Date().toISOString()
    delete journey.submittedSnapshot
    return structuredClone(marshal(journey))
  }
}

export const makeAmend =
  ({ journeys }) =>
  async (journeyId, _actor) => {
    const journey = journeys.get(journeyId)
    if (!journey) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (journey.status !== SUBMITTED) {
      throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
    }
    journey.submittedSnapshot = {
      fulfilment: structuredClone(journey.fulfilment),
      submittedAt: journey.submittedAt
    }
    journey.status = AMEND
    journey.submittedAt = null
    return structuredClone(marshal(journey))
  }

export const makeCancelAmend =
  ({ journeys }) =>
  async (journeyId) => {
    const journey = journeys.get(journeyId)
    if (!journey) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (journey.status !== AMEND || journey.submittedSnapshot == null) {
      throw new Error(
        `Journey "${journeyId}" has no amendment snapshot — cannot cancel amendment`
      )
    }
    journey.fulfilment = structuredClone(journey.submittedSnapshot.fulfilment)
    journey.submittedAt = journey.submittedSnapshot.submittedAt
    journey.status = SUBMITTED
    delete journey.submittedSnapshot
    return structuredClone(marshal(journey))
  }

export const makeSoftDelete =
  ({ journeys }) =>
  async (journeyId, _actor) => {
    const journey = journeys.get(journeyId)
    if (!journey) {
      throw new Error(`Unknown journey "${journeyId}"`)
    }
    if (
      journey.status !== DRAFT &&
      journey.status !== SUBMITTED &&
      journey.status !== AMEND &&
      journey.status !== DELETED
    ) {
      throw new Error(
        `Journey "${journeyId}" is ${journey.status} — cannot delete`
      )
    }
    journey.status = DELETED
    journey.submittedAt = null
    return structuredClone(marshal(journey))
  }
