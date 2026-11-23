import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

const INS_BASE_URL_KEY = 'tradeImportsInsFrontend.baseUrl'

/** Restores the INS frontend base URL after each test and returns the setter
 * a test uses to point it somewhere. The setter takes the config to change,
 * for a test that imports a fresh copy of the config module. */
export const useInsFrontendBaseUrl = () => {
  restoreConfigAfterEach([INS_BASE_URL_KEY])
  return (url, targetConfig = config) => targetConfig.set(INS_BASE_URL_KEY, url)
}
