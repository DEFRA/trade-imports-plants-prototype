import {
  openingRun,
  releaseNextTarget
} from '../../../../../../prototype-support/release-journey.js'
import { SESSION_COOKIE_NAMES } from '../config.js'
import { nextRunTarget } from './run.js'

export {
  changeContext,
  withChangeContext
} from '../../../../../../prototype-support/release-journey.js'

export const {
  beginOpeningRun,
  completeOpeningRun,
  inOpeningRun,
  openingRunStarted
} = openingRun(SESSION_COOKIE_NAMES.openingRun)

export const nextTarget = releaseNextTarget({ inOpeningRun, nextRunTarget })
