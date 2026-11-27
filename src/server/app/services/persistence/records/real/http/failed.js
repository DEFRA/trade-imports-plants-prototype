import { statusCodes } from '../../../../../../common/constants/status-codes.js'
import { BackendRequestError } from '../../errors.js'

export const failed = async (action, response) => {
  const error = new BackendRequestError(action, response)
  if (response.status === statusCodes.conflict) {
    try {
      const body = await response.clone().json()
      if (body?.code) {
        error.code = body.code
      }
    } catch {
      // body wasn't JSON — no code to attach
    }
  }
  return error
}
