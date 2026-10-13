import {
  paginationFor,
  resultsHrefFor
} from '../../address-book-picker/pagination.js'
import { placeOfDestinationPage } from '../page.js'

export const resultsHref = resultsHrefFor(placeOfDestinationPage.slug)

export const pagination = paginationFor(placeOfDestinationPage.slug)
