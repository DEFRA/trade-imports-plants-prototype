import {
  paginationFor,
  resultsHrefFor
} from '../../address-book-picker/pagination.js'
import { consignorPage } from '../page.js'

export const resultsHref = resultsHrefFor(consignorPage.slug)

export const pagination = paginationFor(consignorPage.slug)
