import { copyFor } from '../../../../../../shared/copy.js'
import { pickerRoutes } from '../address-book-picker/picker-routes.js'
import { consignmentContactSelectPage as page } from './page.js'
import { CONTACT_ADDRESS } from './fields.js'
import { pickerViewModel } from './view-model/index.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

export const meta = { ...page, collects: [CONTACT_ADDRESS] }

const copy = copyFor({ en, cy })

export const routes = pickerRoutes({
  page,
  fieldName: CONTACT_ADDRESS,
  copy,
  pickerViewModel,
  heading: () => copy.title,
  description: () => copy.description
})
