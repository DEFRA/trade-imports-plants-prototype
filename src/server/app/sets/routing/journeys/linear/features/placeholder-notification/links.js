import { setBase } from '../../../../../../shared/paths.js'
import { withEntries } from '../find/conversation.js'
import { placeholderNotificationPage as page } from './page.js'

export const placeholderRoutePath = () => `/${page.slug}/{type}`

/**
 * A placeholder notification, carrying the routing answers it starts from.
 *
 * @param {string} type - the notification type.
 * @param {string[][]} entries - the conversation's address entries.
 * @returns {string} the href.
 */
export const placeholderPath = (type, entries) =>
  withEntries(`${setBase()}/${page.slug}/${type}`, entries)
