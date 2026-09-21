import { expect, test } from '@playwright/test'

import { signIn } from '../../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../../shared/copy.en.js'
import { copy as captionsCopy } from '../../../flow/section-captions/copy/copy.en.js'
import { copy as dashboardCopy } from '../../dashboard/copy/copy.en.js'
import { copy as typeCopy } from '../../commodity-type/copy/copy.en.js'
import { copy } from '../copy/copy.en.js'
import { expectNoSeriousOrCriticalViolations } from './axe.js'

const COMMODITY_TYPE_URL = /\/notifications\/[^/]+\/commodity-type$/
const DETAILS_URL = /\/notifications\/[^/]+\/commodities\/details$/
const DETAILS_EDIT_URL =
  /\/notifications\/[^/]+\/commodities\/details\?index=\d+$/
const LIST_URL = /\/notifications\/[^/]+\/commodities$/
const REMOVED_URL = /\/notifications\/[^/]+\/commodities\?removed=\d+$/
const ORIGIN_URL = /\/notifications\/[^/]+\/origin$/

const POTATOES = 'potatoes'
const WOOD = 'wood-and-cut-trees'
const SEED_POTATOES = 'seed-potatoes'
const WARE_POTATOES = 'ware-potatoes'
const MARIS_PIPER = 'Maris Piper'
const KING_EDWARD = 'King Edward'
const HUB_PATH_SEGMENTS = 3

const saveAndContinue = (page) =>
  page.getByRole('button', { name: sharedCopy.saveActions.saveAndContinue })

const fieldNamed = (page, field) =>
  page.getByLabel(copy.details.fields[field].label, { exact: true })

const hubUrlOf = (page) =>
  new URL(page.url()).pathname.split('/').slice(0, HUB_PATH_SEGMENTS).join('/')

const commodityTypeUrlOf = (page) => `${hubUrlOf(page)}/commodity-type`

const listUrlOf = (page) => `${hubUrlOf(page)}/commodities`

const startAtDetails = async (page, commodityType) => {
  await page.goto('/')
  await page.getByRole('button', { name: dashboardCopy.startButton }).click()
  await expect(page).toHaveURL(COMMODITY_TYPE_URL)
  await page
    .getByRole('radio', {
      name: typeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(DETAILS_URL)
}

const addPotatoLine = async (page, { category, variety, quantity }) => {
  await page
    .getByRole('radio', { name: copy.categoryLabels[category], exact: true })
    .check()
  await page.getByRole('button', { name: copy.details.continue }).click()
  await expect(page).toHaveURL(DETAILS_EDIT_URL)
  await fieldNamed(page, 'potatoVariety').fill(variety)
  await fieldNamed(page, 'quantity').fill(quantity)
  await fieldNamed(page, 'potatoIntendedUse').fill('Planting')
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(LIST_URL)
}

const startWithOneLine = async (page) => {
  await startAtDetails(page, POTATOES)
  await addPotatoLine(page, {
    category: SEED_POTATOES,
    variety: MARIS_PIPER,
    quantity: '250'
  })
}

const addSecondLine = async (page) => {
  await page.getByRole('button', { name: copy.list.addAnother }).click()
  await expect(page).toHaveURL(DETAILS_URL)
  await addPotatoLine(page, {
    category: WARE_POTATOES,
    variety: KING_EDWARD,
    quantity: '80'
  })
}

const changeTypeTo = async (page, commodityType) => {
  await page.goto(commodityTypeUrlOf(page))
  await page
    .getByRole('radio', {
      name: typeCopy.typeLabels[commodityType],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
}

test.describe('commodities list', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('sends a consignment with no line straight to the entry page', async ({
    page
  }) => {
    await startAtDetails(page, POTATOES)

    await page.goto(listUrlOf(page))

    await expect(page).toHaveURL(DETAILS_URL)
  })

  test('renders the caption, the heading and every saved line', async ({
    page
  }) => {
    await startWithOneLine(page)
    await addSecondLine(page)

    await expect(
      page.getByText(captionsCopy.sections.aboutTheConsignment, { exact: true })
    ).toBeVisible()
    await expect(
      page.getByRole('heading', { name: copy.list.heading, level: 1 })
    ).toBeVisible()

    const rows = page.getByRole('row')
    await expect(rows).toHaveCount(3)
    await expect(rows.nth(1)).toContainText(copy.categoryLabels[SEED_POTATOES])
    await expect(rows.nth(1)).toContainText(MARIS_PIPER)
    await expect(rows.nth(1)).toContainText('250')
    await expect(rows.nth(2)).toContainText(KING_EDWARD)
  })

  test('sends Change to the entry page for that line', async ({ page }) => {
    await startWithOneLine(page)

    await page
      .getByRole('link', {
        name: `${copy.list.change} ${copy.list.changeHidden(1)}`
      })
      .click()

    await expect(page).toHaveURL(DETAILS_EDIT_URL)
    await expect(fieldNamed(page, 'potatoVariety')).toHaveValue(MARIS_PIPER)
  })

  test('removes the line the Remove button names', async ({ page }) => {
    await startWithOneLine(page)
    await addSecondLine(page)

    await page
      .getByRole('button', {
        name: `${copy.list.remove} ${copy.list.removeHidden(1)}`
      })
      .click()

    await expect(page).toHaveURL(LIST_URL)
    await expect(page.getByRole('table')).not.toContainText(MARIS_PIPER)
    await expect(page.getByRole('table')).toContainText(KING_EDWARD)
  })

  test('sends a trader who removed the last line back to the entry page', async ({
    page
  }) => {
    await startWithOneLine(page)

    await page
      .getByRole('button', {
        name: `${copy.list.remove} ${copy.list.removeHidden(1)}`
      })
      .click()

    await expect(page).toHaveURL(DETAILS_URL)
  })

  test('leaves the section for the origin page on Save and continue', async ({
    page
  }) => {
    await startWithOneLine(page)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(ORIGIN_URL)
  })

  test('ends with the primary control alone', async ({ page }) => {
    await startWithOneLine(page)

    await expect(saveAndContinue(page)).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: sharedCopy.saveActions.saveAndReturnToHub
      })
    ).toBeHidden()
    await expect(
      page.getByRole('link', {
        name: sharedCopy.saveActions.cancelAndReturnToHub
      })
    ).toBeHidden()
  })

  test('has no serious or critical axe violations reading the lines back', async ({
    page
  }) => {
    await startWithOneLine(page)

    await expectNoSeriousOrCriticalViolations(page, 'Commodities list')
  })
})

test.describe('commodities list — after a change of commodity type', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page)
  })

  test('warns before a change that would remove saved lines', async ({
    page
  }) => {
    await startWithOneLine(page)
    await page.goto(commodityTypeUrlOf(page))

    await expect(page.getByText(typeCopy.linesWarning)).toBeVisible()
  })

  test('reports what a change of type removed, and offers a fresh start', async ({
    page
  }) => {
    await startWithOneLine(page)
    await changeTypeTo(page, WOOD)

    await expect(page).toHaveURL(REMOVED_URL)
    await expect(
      page.getByRole('region', { name: copy.list.removed.title })
    ).toContainText(copy.list.removed.body(1, typeCopy.typeLabels[WOOD]))
    await expect(page.getByText(copy.list.empty)).toBeVisible()
    await expect(
      page.getByRole('button', { name: copy.list.addAnother })
    ).toBeVisible()
  })

  test('holds an emptied consignment at the collection floor', async ({
    page
  }) => {
    await startWithOneLine(page)
    await changeTypeTo(page, WOOD)

    await saveAndContinue(page).click()

    await expect(page).toHaveURL(REMOVED_URL)
    const summaryLink = page
      .getByRole('alert')
      .getByRole('link', { name: copy.list.errors.commodityLines })
    await expect(summaryLink).toBeVisible()

    await summaryLink.click()
    await expect(page.locator('#commodityLines')).toBeFocused()
  })

  test('has no serious or critical axe violations reporting a removal', async ({
    page
  }) => {
    await startWithOneLine(page)
    await changeTypeTo(page, WOOD)
    await expect(page).toHaveURL(REMOVED_URL)

    await expectNoSeriousOrCriticalViolations(
      page,
      'Commodities list, removal reported'
    )
  })
})
