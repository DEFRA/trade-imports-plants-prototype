import { fromRow } from './from-row.js'

/** The address book for `STUB_MODE=true` — local development and the
 * frontend Playwright suite without the address-book service running.
 *
 * The parties are deliberately domain-neutral: the journey's real trading
 * parties are not yet agreed, and nothing here should imply an industry.
 *
 * Each record carries a role from one group only, except
 * `unlisted-traders-ltd`, which carries none. Country is the display name
 * `client.js` would resolve from a record's `countryCode` (or the literal
 * "United Kingdom" a record stores as-is). */
export const STUB_BOOK = [
  'northgate-trading-ag|Northgate Trading AG|43 East Hague Extension|Bern|30055|Switzerland|CH|CONSIGNOR',
  'tech-imports-ltd|Tech Imports Ltd|18 Dockside Road|London|E14 9GE|United Kingdom|GB|PLACE_OF_DESTINATION',
  'westbrook-supplies-ltd|Westbrook Supplies Ltd|1 Harbour Lane|Ennis|V95 X7P2|Ireland|IE|CONSIGNOR',
  'brookfield-trading-ltd|Brookfield Trading Ltd|10 Market Street|Leeds|LS1 6HB|United Kingdom|GB|PLACE_OF_DESTINATION',
  'import-co-uk|Import Co UK|20 Trade Road|London|EC1A 1BB|United Kingdom|GB|PLACE_OF_DESTINATION',
  'national-inspection-authority|National Inspection Authority|Woodham Lane|Addlestone|KT15 3NB|United Kingdom|GB|BRANCH_ADDRESS',
  'copenhagen-exports-aps|Copenhagen Exports ApS|Havnegade 21|Copenhagen|1058|Denmark|DK|PLACE_OF_DESTINATION',
  'aarhus-trading-aps|Aarhus Trading ApS|Sondergade 4|Aarhus|8000|Denmark|DK|CONSIGNOR',
  'lille-commerce-sarl|Lille Commerce SARL|12 Rue de la Gare|Lille|59000|France|FR|CONSIGNOR',
  'nordvik-trading-as|Nordvik Trading AS|Havnegata 8|Alesund|6002|Norway|NO|PLACE_OF_DESTINATION',
  'alpine-supplies-gmbh|Alpine Supplies GmbH|Bahnhofstrasse 17|Innsbruck|6020|Austria|AT|CONSIGNOR',
  'kilkenny-traders-ltd|Kilkenny Traders Ltd|Castle Road 9|Kilkenny|R95 F2X8|Ireland|IE|CONSIGNOR',
  'iberian-commerce-sa|Iberian Commerce SA|Calle Mayor 44|Huesca|22001|Spain|ES|CONSIGNOR',
  'unlisted-traders-ltd|Unlisted Traders Ltd|9 Quayside|Hull|HU1 1TQ|United Kingdom|GB|'
].map(fromRow)
