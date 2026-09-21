import { describe, it, expect } from 'vitest'
import {
  computeReadyForCheckYourAnswers,
  configureReadyForCheckYourAnswers
} from './readiness-config.js'

// The readiness seam's own contract: fail-closed until L1 injects the real
// roll-up. Every other suite configures the seam first, so only this one
// observes the unconfigured default.

describe('bridge/readiness-config', () => {
  it('Should be fail-closed before anything configures the seam', () => {
    expect(computeReadyForCheckYourAnswers({}, new Set(), {})).toBe(false)
  })

  it('Should return the injected roll-up once configured', () => {
    configureReadyForCheckYourAnswers(() => true)
    expect(computeReadyForCheckYourAnswers({}, new Set(), {})).toBe(true)
  })
})
