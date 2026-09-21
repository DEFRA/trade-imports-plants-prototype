import {
  paginationFor,
  resultsHrefFor
} from '../../address-book-picker/pagination.js'
import { consignmentContactSelectPage } from '../page.js'

export const resultsHref = resultsHrefFor(consignmentContactSelectPage.slug)

export const pagination = paginationFor(consignmentContactSelectPage.slug)
