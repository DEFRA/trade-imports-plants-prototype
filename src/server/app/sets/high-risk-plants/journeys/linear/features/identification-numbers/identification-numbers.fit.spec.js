import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../flow/section-captions/copy/copy.en.js'
import { copy as commoditiesCopy } from '../commodities/copy/copy.en.js'
import { copy as commodityTypeCopy } from '../commodity-type/copy/copy.en.js'
import { copy as dashboardCopy } from '../dashboard/copy/copy.en.js'
import { copy as hubCopy } from '../hub/copy/copy.en.js'
import { copy } from './copy/copy.en.js'

const PLANTS_FOR_PLANTING = 'plants-for-planting'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const COMMODITY_DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details/
const COMMODITY_LIST_URL = /\/notifications\/[^/]+\/commodities$/
const COMMODITY_REMOVED_URL =
  /\/notifications\/[^/]+\/commodities\?removed=\d+$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/
const HUB_URL = /\/notifications\/[^/]+$/
const PAGE_URL = /\/notifications\/[^/]+\/identification-numbers/
const JOURNEY_ID_SEGMENT = 2

const COUNTRY_INPUT = 'input#countryOfOrigin'

const FRANCE = 'France'
const WOOD_AND_CUT_TREES = 'wood-and-cut-trees'
const CUT_CONIFEROUS_TREES = 'cut-coniferous-trees'

const WOOD_LINE_FIELDS = {
  commodityCode: '06042020',
  quantity: '40',
  sizeOfTree: '3.5',
  phytosanitaryTreatments: 'Heat treatment'
}

const backLink = (page) =>
  page.getByRole('link', { name: sharedCopy.layout.back, exact: true })

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const identificationPathOf = (reference) =>
  `/notifications/${reference}/identification-numbers`

const startNotification = async (page) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  return new URL(page.url()).pathname.split('/')[JOURNEY_ID_SEGMENT]
}

const pickCommodityType = async (page, commodityType) => {
  await page
    .getByRole('radio', {
      name: commodityTypeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
}

// The first choice, made with no lines saved, carries on to the details page.
const chooseCommodityType = async (page, commodityType) => {
  await pickCommodityType(page, commodityType)
  await expect(page).toHaveURL(COMMODITY_DETAILS_URL)
}

// Changing type once a line is saved drops the lines the new type cannot
// hold, and the list page stays put to report the removal.
const changeCommodityTypeTo = async (page, reference, commodityType) => {
  await page.goto(`/notifications/${reference}/commodity-type`)
  await pickCommodityType(page, commodityType)
  await expect(page).toHaveURL(COMMODITY_REMOVED_URL)
}

const addLine = async (page, category, values) => {
  await page
    .getByRole('radio', {
      name: commoditiesCopy.categoryLabels[category],
      exact: true
    })
    .check()
  await page
    .getByRole('button', { name: commoditiesCopy.details.continue })
    .click()
  for (const [field, value] of Object.entries(values)) {
    await page
      .getByLabel(commoditiesCopy.details.fields[field].label, { exact: true })
      .fill(value)
  }
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(COMMODITY_LIST_URL)
}

// The country list enhances a native select, so the visible combobox keeps the
// field's own id.
const chooseCountry = async (page, name) => {
  const field = page.locator(COUNTRY_INPUT)
  await field.click()
  await field.fill(name)
  await page.getByRole('option', { name, exact: true }).click()
}

const saveOrigin = async (page, reference, country) => {
  await page.goto(`/notifications/${reference}/origin`)
  await expect(page).toHaveURL(ORIGIN_URL)
  await chooseCountry(page, country)
  await saveAndContinue(page).click()
}

// A wood notification with the prerequisite origin answered.
const startAtIdentification = async (page) => {
  const reference = await startNotification(page)
  await chooseCommodityType(page, WOOD_AND_CUT_TREES)
  await addLine(page, CUT_CONIFEROUS_TREES, WOOD_LINE_FIELDS)
  await saveOrigin(page, reference, FRANCE)
  await page.goto(identificationPathOf(reference))
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}

const expectNoSeriousOrCriticalViolations = async (page, subject) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousOrCritical = results.violations.filter(({ impact }) =>
    ['serious', 'critical'].includes(impact)
  )

  expect(
    seriousOrCritical,
    `${subject} has serious/critical accessibility violations.\nFull axe violations:\n${JSON.stringify(results.violations, null, 2)}`
  ).toEqual([])
}

const input = (page, name) =>
  page.getByLabel(copy.fields[name].label, { exact: true })
const branches = [
  ['wood-and-cut-trees', ['consignmentNumber']],
  [PLANTS_FOR_PLANTING, ['supplierIdentificationNumber', 'consignmentNumber']],
  [
    'potatoes',
    [
      'producerIdentificationNumber',
      'cropIdentificationNumber',
      'consignmentNumber'
    ]
  ]
]
const selectBranch = async (page, commodityType) => {
  const reference = await startAtIdentification(page)
  if (commodityType !== WOOD_AND_CUT_TREES) {
    await changeCommodityTypeTo(page, reference, commodityType)
    await page.goto(identificationPathOf(reference))
  }
  await expect(page).toHaveURL(PAGE_URL)
  return reference
}
for (const [commodityType, fields] of branches) {
  test.describe(`identification numbers ${commodityType}`, () => {
    test.beforeEach(async ({ page }) => {
      await signIn(page)
      await selectBranch(page, commodityType)
    })
    test('renders only applicable fields, saves and reloads them and completes the hub row', async ({
      page
    }) => {
      const url = page.url()
      await expect(
        page.getByRole('heading', { name: copy.title, level: 1 })
      ).toBeVisible()
      await expect(
        page.getByText(captionsCopy.sections.consignmentParties, {
          exact: true
        })
      ).toBeVisible()
      for (const name of Object.keys(copy.fields)) {
        if (fields.includes(name)) {
          await expect(input(page, name)).toBeVisible()
          await expect(
            page.getByText(copy.fields[name].hint, { exact: true })
          ).toBeVisible()
          await input(page, name).fill(' ID_123 ')
        } else {
          await expect(input(page, name)).toHaveCount(0)
        }
      }
      await saveAndContinue(page).click()
      await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
      await saveAndContinue(page).click()
      await expect(page).toHaveURL(HUB_URL)
      await expect(
        page.getByRole('listitem').filter({
          has: page.getByRole('link', {
            name: hubCopy.rows.identificationNumbers.title
          })
        })
      ).toContainText(hubCopy.statuses.completed)
      await page
        .getByRole('link', { name: hubCopy.rows.identificationNumbers.title })
        .click()
      await expect(page).toHaveURL(url)
      await page.reload()
      for (const name of fields) {
        await expect(input(page, name)).toHaveValue('ID_123')
      }
    })
    for (const name of fields) {
      const rules =
        name === 'consignmentNumber'
          ? [
              ['x'.repeat(59), 'maxLength'],
              ['bad-reference', 'pattern']
            ]
          : [
              ['', 'required'],
              ['x'.repeat(59), 'maxLength']
            ]
      for (const [invalid, rule] of rules) {
        test(`rejects ${name} ${rule} and focuses its error link`, async ({
          page
        }) => {
          for (const field of fields) {
            await input(page, field).fill('ID_123')
          }
          await input(page, name).fill(invalid)
          await saveAndContinue(page).click()
          const link = page
            .getByRole('alert')
            .getByRole('link', { name: copy.errors[name][rule], exact: true })
          await link.click()
          await expect(input(page, name)).toBeFocused()
          for (const field of fields) {
            await expect(input(page, field)).toHaveValue(
              field === name ? invalid : 'ID_123'
            )
          }
        })
      }
    }
    test('saves to overview and cancels without saving subsequent changes', async ({
      page
    }) => {
      const url = page.url()
      for (const name of fields) {
        await input(page, name).fill('REF')
      }
      await page
        .getByRole('button', {
          name: sharedCopy.saveActions.saveAndReturnToHub
        })
        .click()
      await expect(page).toHaveURL(HUB_URL)
      await page.goto(url)
      for (const name of fields) {
        await input(page, name).fill('CHANGED')
      }
      await page
        .getByRole('link', {
          name: sharedCopy.saveActions.cancelAndReturnToHub
        })
        .click()
      await expect(page).toHaveURL(HUB_URL)
      await page.goto(url)
      for (const name of fields) {
        await expect(input(page, name)).toHaveValue('REF')
      }
      await backLink(page).click()
      await expect(page).toHaveURL(HUB_URL)
    })
    test('has no serious or critical accessibility violations initially or after errors', async ({
      page
    }) => {
      await expectNoSeriousOrCriticalViolations(
        page,
        'Identification numbers initial'
      )
      await input(page, 'consignmentNumber').fill('bad-reference')
      await saveAndContinue(page).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expectNoSeriousOrCriticalViolations(
        page,
        'Identification numbers errors'
      )
    })
  })
}

test('wood can leave the optional reference blank and the overview labels it Optional', async ({
  page
}) => {
  await signIn(page)
  await startAtIdentification(page)
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(HUB_URL)
  const row = page.getByRole('listitem').filter({
    has: page.getByRole('link', {
      name: hubCopy.rows.identificationNumbers.title
    })
  })
  await expect(row).toContainText(hubCopy.statuses.optional)
})

test('changing commodity type purges the supplier number and preserves the common reference', async ({
  page
}) => {
  await signIn(page)
  const reference = await selectBranch(page, PLANTS_FOR_PLANTING)
  await input(page, 'supplierIdentificationNumber').fill('GB-12345')
  await input(page, 'consignmentNumber').fill('REF')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(/\/consignment\/contact\/select$/)
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(HUB_URL)
  await page.goto(`/notifications/${reference}/commodity-type`)
  await chooseCommodityType(page, 'potatoes')
  await page.goto(identificationPathOf(reference))
  await expect(input(page, 'supplierIdentificationNumber')).toHaveCount(0)
  await expect(input(page, 'producerIdentificationNumber')).toBeVisible()
  await expect(input(page, 'cropIdentificationNumber')).toBeVisible()
  await expect(input(page, 'consignmentNumber')).toHaveValue('REF')
  await page.goto(`/notifications/${reference}/commodity-type`)
  await chooseCommodityType(page, PLANTS_FOR_PLANTING)
  await page.goto(identificationPathOf(reference))
  await expect(input(page, 'supplierIdentificationNumber')).toHaveValue('')
  await expect(input(page, 'consignmentNumber')).toHaveValue('REF')
})
