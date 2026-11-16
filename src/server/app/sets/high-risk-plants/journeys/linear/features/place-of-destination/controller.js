import { copyFor } from '../../../../../../shared/copy.js'
import { pickerRoutes } from '../address-book-picker/picker-routes.js'
import {
  ALREADY_ARRIVED,
  ARRIVAL_STATUS,
  NOT_YET_ARRIVED
} from '../arrival-status/statuses.js'
import { placeOfDestinationPage as page } from './page.js'
import { PLACE_OF_DESTINATION, POTATO_DESTINATION } from './fields.js'
import { pickerViewModel } from './view-model/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: [PLACE_OF_DESTINATION] }

const copy = copyFor({ en, cy })

const destinationStateOf = ({ answers, scope }) => {
  if (!scope.has(ARRIVAL_STATUS)) {
    return POTATO_DESTINATION
  }
  return answers[ARRIVAL_STATUS] === ALREADY_ARRIVED
    ? ALREADY_ARRIVED
    : NOT_YET_ARRIVED
}

export const routes = pickerRoutes({
  page,
  fieldName: PLACE_OF_DESTINATION,
  copy,
  pickerViewModel,
  heading: (current) => copy.headings[destinationStateOf(current)],
  description: (current) => copy.descriptions[destinationStateOf(current)]
})
