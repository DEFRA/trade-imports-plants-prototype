import { fromRow } from './from-row.js'

/** The address book for `STUB_MODE=true` — local development and the
 * frontend Playwright suite without the address-book service running.
 *
 * The parties are deliberately domain-neutral: the journey's real trading
 * parties are not yet agreed, and nothing here should imply an industry.
 *
 * Held in the same page order the service returns (five per page): rows 1–5
 * are the happy-path parties, then the competent authority plus the
 * pagination records. Country is the display name `client.js` would resolve
 * from a record's `countryCode` (or the literal "United Kingdom" a record
 * stores as-is). */
export const STUB_BOOK = [
  'northgate-trading-ag|Northgate Trading AG|43 East Hague Extension|Bern|30055|Switzerland|CH',
  'tech-imports-ltd|Tech Imports Ltd|18 Dockside Road|London|E14 9GE|United Kingdom|GB',
  'westbrook-supplies-ltd|Westbrook Supplies Ltd|1 Harbour Lane|Ennis|V95 X7P2|Ireland|IE',
  'brookfield-trading-ltd|Brookfield Trading Ltd|10 Market Street|Leeds|LS1 6HB|United Kingdom|GB',
  'import-co-uk|Import Co UK|20 Trade Road|London|EC1A 1BB|United Kingdom|GB',
  'national-inspection-authority|National Inspection Authority|Woodham Lane|Addlestone|KT15 3NB|United Kingdom|GB',
  'copenhagen-exports-aps|Copenhagen Exports ApS|Havnegade 21|Copenhagen|1058|Denmark|DK',
  'aarhus-trading-aps|Aarhus Trading ApS|Sondergade 4|Aarhus|8000|Denmark|DK',
  'lille-commerce-sarl|Lille Commerce SARL|12 Rue de la Gare|Lille|59000|France|FR',
  'nordvik-trading-as|Nordvik Trading AS|Havnegata 8|Alesund|6002|Norway|NO',
  'alpine-supplies-gmbh|Alpine Supplies GmbH|Bahnhofstrasse 17|Innsbruck|6020|Austria|AT',
  'kilkenny-traders-ltd|Kilkenny Traders Ltd|Castle Road 9|Kilkenny|R95 F2X8|Ireland|IE',
  'iberian-commerce-sa|Iberian Commerce SA|Calle Mayor 44|Huesca|22001|Spain|ES'
].map(fromRow)
