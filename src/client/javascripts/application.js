import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  ServiceNavigation,
  SkipLink
} from 'govuk-frontend'
import { DatePicker } from '@ministryofjustice/frontend'
import AccessibleAutocomplete from './components/accessible-autocomplete.js'
import AddressBookPicker from './components/address-book-picker.js'
import StatusAnnouncer from './components/status-announcer.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(ServiceNavigation)
createAll(SkipLink)
createAll(DatePicker)
createAll(AccessibleAutocomplete)
createAll(AddressBookPicker)
createAll(StatusAnnouncer)
