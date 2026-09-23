import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { marshal } from '../marshal/document.js'
import { makeLoadWritable } from '../store/writable.js'

export const makeReplaceFulfilment = (store) => {
  const loadWritable = makeLoadWritable(store)
  return async (journeyId, fulfilment) => {
    const journey = loadWritable(journeyId)
    journey.fulfilment = structuredClone(
      encodeEvaluatorFulfilments(fulfilment ?? {})
    )
    return structuredClone(marshal(journey))
  }
}

export const makeClear =
  ({ journeys, copiesBySourceAndKey }) =>
  async () => {
    journeys.clear()
    copiesBySourceAndKey.clear()
  }
