import {
  BASE,
  notificationPageWithTrail
} from '../../../../../../../../../fit/set-base.js'
import {
  POTATO_CHANGE_LINK_TRAIL,
  POTATO_VARIETY,
  REVIEW_URL_WITHOUT_TRAIL,
  completePotatoNotification,
  expectDraftReviewFoot,
  expectNoSeriousOrCriticalViolations,
  formSubmittedBy,
  notificationReferenceHeading,
  viewHeaderTag,
  journeyStripStatus,
  saveAndReturnToHub,
  continueFromChangedCommodityLine,
  saveAndContinue,
  submitDeclarationFromCheckAnswers,
  withoutJavaScript
} from '../../../../../../../../../fit/high-risk-plants-journey.js'
import { expect, test } from '@playwright/test'
import { signIn } from '../../../../../../../../../fit/sign-in.js'
import { copy as sharedCopy } from '../../../../../../shared/copy.en.js'
import { formatMomentAsLongDay } from '../../../../../../lib/validate/index.js'
import { copy } from './copy/copy.en.js'
import { copy as deleteCopy } from '../delete-notification/copy/copy.en.js'
import { copy as destinationCopy } from '../place-of-destination/copy/copy.en.js'
import { TECH_IMPORTS_ADDRESS_LINES } from '../../test-support.js'

const NOTIFICATION_VIEW = 'notification-view'

const main = (page) => page.getByRole('main')

const viewHeaderButtons = (page) =>
  main(page).locator('.govuk-button-group').first()

const importReferences = (page) =>
  page.getByRole('region', { name: copy.importReferences.heading })

const summaryValues = (section) => section.getByRole('definition')

const expectReferenceAndCustomsDocumentCode = async (section, reference) => {
  await expect(section.getByText(copy.importReferences.warning)).toBeVisible()
  await expect(section.getByRole('term')).toHaveText([
    copy.importReferences.notificationReference,
    copy.importReferences.customsDocumentCode
  ])
  await expect(summaryValues(section)).toHaveText([reference, 'C085'])
}

test.beforeEach(async ({ page }) => signIn(page))

test('renders saved answers, scoped cards and accessible Change links that open their page on the review trail and go on with Save and continue', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  await expect(notificationReferenceHeading(page)).toBeVisible()
  for (const heading of Object.values(copy.sections)) {
    await expect(
      page.getByRole('heading', { name: heading, level: 2 })
    ).toBeVisible()
  }
  await expect(
    page.getByRole('heading', { name: copy.cards.consignor, exact: true })
  ).toHaveCount(0)
  await expect(page.getByText(POTATO_VARIETY, { exact: true })).toBeVisible()
  const addressValueIn = (cardTitle) =>
    page
      .locator('.govuk-summary-card', {
        has: page.getByRole('heading', { name: cardTitle, exact: true })
      })
      .locator('.govuk-summary-list__row', {
        has: page.getByRole('term').getByText(copy.labels.address, {
          exact: true
        })
      })
      .getByRole('definition')
  const expectedAddress = TECH_IMPORTS_ADDRESS_LINES.join('\n')
  await expect(addressValueIn(destinationCopy.headings.potatoes)).toHaveText(
    expectedAddress,
    { useInnerText: true }
  )
  await expect(addressValueIn(copy.cards.contact)).toHaveText(expectedAddress, {
    useInnerText: true
  })
  await expectNoSeriousOrCriticalViolations(page, 'Check answers')
  await page
    .getByRole('link', {
      name: 'Change country of origin (Import details)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', POTATO_CHANGE_LINK_TRAIL)
  )
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('arrival-details', [
      ...POTATO_CHANGE_LINK_TRAIL,
      'origin'
    ])
  )
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('commodities/details\\?index=0', [
      NOTIFICATION_VIEW
    ])
  )
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('300')
  await continueFromChangedCommodityLine(page, [NOTIFICATION_VIEW])
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.reload()
  await expect(page.getByText('300', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(
    new RegExp(`${BASE}/notifications/${reference}/declaration$`)
  )
})

const deleteButton = (page) =>
  page.getByRole('button', { name: copy.delete, exact: true })

test('a draft check answers ends with Continue and Save and return in one button group, with its warning Delete notification button in the header', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  await expectDraftReviewFoot(page)
  const headerDelete = viewHeaderButtons(page).getByRole('button', {
    name: copy.delete,
    exact: true
  })
  await expect(headerDelete).toHaveAttribute('href', `${hub}/delete`)
  await expect(headerDelete).toHaveClass(/govuk-button--warning/)
  await saveAndReturnToHub(page).click()
  await expect(page).toHaveURL(new RegExp(`${hub}$`))
})

test('a draft check answers offers Cancel and return to overview and Back to the contact page', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  const hub = `${BASE}/notifications/${reference}`
  await expect(
    page.getByRole('link', { name: sharedCopy.layout.back, exact: true })
  ).toHaveAttribute('href', new RegExp(`^${hub}/consignment/contact/select`))
  await expect(
    page.getByRole('link', {
      name: sharedCopy.saveActions.cancelAndReturnToHub,
      exact: true
    })
  ).toHaveAttribute('href', hub)
})

test('Delete notification on a draft opens the delete page', async ({
  page
}) => {
  await completePotatoNotification(page)

  await deleteButton(page).click()

  await expect(
    page.getByRole('heading', { name: deleteCopy.title, level: 1 })
  ).toBeVisible()
})

test('rechecks a saved origin after a commodity change and exposes an accessible correction link', async ({
  page
}) => {
  const reference = await completePotatoNotification(page)
  await page
    .getByRole('link', {
      name: 'Change Commodity 1 (Commodity 1)',
      exact: true
    })
    .click()
  await page
    .getByRole('radio', {
      name: copy.categoryLabels['ware-potatoes'],
      exact: true
    })
    .check()
  await saveAndContinue(page).click()
  await expect(page).toHaveURL(
    notificationPageWithTrail(
      'commodities/details\\?index=0',
      POTATO_CHANGE_LINK_TRAIL
    )
  )
  await page
    .getByLabel(copy.labels.potatoVariety, { exact: true })
    .fill(POTATO_VARIETY)
  await page.getByLabel(copy.labels.quantity, { exact: true }).fill('250')
  await page
    .getByLabel(copy.labels.potatoIntendedUse, { exact: true })
    .fill('Planting')
  await continueFromChangedCommodityLine(page, POTATO_CHANGE_LINK_TRAIL)
  await page.goto(`${BASE}/notifications/${reference}/notification-view`)
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  await page.getByRole('button', { name: copy.continue, exact: true }).click()
  await expect(page).toHaveURL(REVIEW_URL_WITHOUT_TRAIL)
  const error = page.getByRole('link', { name: /Poland/ })
  await expect(error).toHaveAttribute(
    'href',
    `${BASE}/notifications/${reference}/origin?from=notification-view`
  )
  await expectNoSeriousOrCriticalViolations(
    page,
    'Check answers with an origin error'
  )
  await error.click()
  await expect(page).toHaveURL(
    notificationPageWithTrail('origin', [NOTIFICATION_VIEW])
  )
})

test.describe('a draft notification', () => {
  let reference
  let createdBefore
  let createdAfter

  test.beforeEach(async ({ page }) => {
    createdBefore = Date.now()
    reference = await completePotatoNotification(page)
    createdAfter = Date.now()
  })

  test('is headed by its reference with a Draft tag beside it and a title naming the reference', async ({
    page
  }) => {
    await expect(notificationReferenceHeading(page)).toBeVisible()
    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.draft)
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('dates the notification by its creation under its header', async ({
    page
  }) => {
    const createdLines = new Set(
      [createdBefore, createdAfter].map((instant) =>
        copy.viewHeader.dateCreated(formatMomentAsLongDay(new Date(instant)))
      )
    )
    const alternatives = [...createdLines].map(RegExp.escape).join('|')

    await expect(page.getByText(/^Date created: /)).toHaveText(
      new RegExp(`^(${alternatives})$`)
    )
  })

  test('offers only Delete notification in its header, with no Copy as new and no Amend this notification', async ({
    page
  }) => {
    await expect(viewHeaderButtons(page).getByRole('button')).toHaveText([
      copy.delete
    ])
  })

  test("shows a draft's import reference numbers with the warning, the notification reference and the customs document code C085", async ({
    page
  }) => {
    await expectReferenceAndCustomsDocumentCode(
      importReferences(page),
      reference
    )
  })

  test('keeps its Change links on the cards and ends with Continue', async ({
    page
  }) => {
    const cards = page.locator('.govuk-summary-card')
    const cardsWithChangeLink = cards.filter({
      has: page.getByRole('link', { name: new RegExp(`^${copy.change}`) })
    })

    await expect(cards).not.toHaveCount(0)
    await expect(cardsWithChangeLink).toHaveCount(await cards.count())
    await expectDraftReviewFoot(page)
  })

  test('has no serious or critical axe violations', async ({ page }) => {
    await expectNoSeriousOrCriticalViolations(page, 'Draft check answers')
  })
})

test.describe('a submitted notification', () => {
  let reference

  let submittedBefore
  let submittedAfter

  test.beforeEach(async ({ page }) => {
    reference = await completePotatoNotification(page)
    submittedBefore = Date.now()
    await submitDeclarationFromCheckAnswers(page, reference)
    submittedAfter = Date.now()
    await page.goto(`${BASE}/notifications/${reference}/notification-view`)
    await expect(notificationReferenceHeading(page)).toBeVisible()
  })

  test('is headed by its reference with a Submitted tag beside it and a title naming the reference', async ({
    page
  }) => {
    await expect(
      viewHeaderTag(page, sharedCopy.journeyStrip.submitted)
    ).toBeVisible()
    await expect(page).toHaveTitle(
      `${reference} - ${sharedCopy.layout.serviceName} - ${sharedCopy.layout.govukSuffix}`
    )
  })

  test('dates the notification under its header', async ({ page }) => {
    const submittedLines = new Set(
      [submittedBefore, submittedAfter].map((instant) =>
        copy.viewHeader.dateSubmitted(formatMomentAsLongDay(new Date(instant)))
      )
    )
    const alternatives = [...submittedLines].map(RegExp.escape).join('|')

    await expect(page.getByText(/^Date submitted: /)).toHaveText(
      new RegExp(`^(${alternatives})$`)
    )
  })

  test('offers Amend this notification and Delete notification in its header, and Delete notification nowhere else', async ({
    page
  }) => {
    await expect(main(page).getByRole('button')).toHaveText([
      copy.viewHeader.amend,
      copy.delete
    ])
    await expect(deleteButton(page)).toHaveCount(1)
  })

  test('posts Amend this notification from a form holding only the crumb, with Delete notification a link outside it', async ({
    page
  }) => {
    const { form: amendForm, submitButtons } = await formSubmittedBy(
      viewHeaderButtons(page).getByRole('button', {
        name: copy.viewHeader.amend
      })
    )

    await expect(amendForm).toHaveAttribute('action', /\/amend$/)
    expect(
      await amendForm
        .locator('input')
        .evaluateAll((inputs) => inputs.map(({ name }) => name))
    ).toEqual(['crumb'])
    await expect(submitButtons).toHaveText([copy.viewHeader.amend])
    await expect(deleteButton(page)).toHaveAttribute('href', /\/delete$/)
  })

  test('Amend this notification opens the amendment when JavaScript is off', async ({
    page,
    browser
  }) => {
    await withoutJavaScript(page, browser, async (noJs) => {
      await noJs.getByRole('button', { name: copy.viewHeader.amend }).click()

      await expect(
        journeyStripStatus(noJs, sharedCopy.journeyStrip.amend)
      ).toBeVisible()
    })
  })

  test('Delete notification opens the delete page when JavaScript is off', async ({
    page,
    browser
  }) => {
    await withoutJavaScript(page, browser, async (noJs) => {
      await deleteButton(noJs).click()

      await expect(
        noJs.getByRole('heading', { level: 1, name: deleteCopy.title })
      ).toBeVisible()
    })
  })

  test('Amend this notification opens the amendment review', async ({
    page
  }) => {
    await page.getByRole('button', { name: copy.viewHeader.amend }).click()

    await expect(page).toHaveURL(
      new RegExp(`/notifications/${reference}/notification-view`)
    )
    await expect(
      page.getByRole('heading', { level: 1, name: copy.title })
    ).toBeVisible()
    await expect(
      journeyStripStatus(page, sharedCopy.journeyStrip.amend)
    ).toBeVisible()
  })

  test("shows a submitted notification's import reference numbers with the warning, the notification reference and the customs document code C085", async ({
    page
  }) => {
    await expectReferenceAndCustomsDocumentCode(
      importReferences(page),
      reference
    )
  })

  test('shows the import reference numbers as text with no button when JavaScript is off', async ({
    page,
    browser
  }) => {
    await withoutJavaScript(page, browser, async (noJs) => {
      const section = importReferences(noJs)

      await expectReferenceAndCustomsDocumentCode(section, reference)
      await expect(section.getByRole('button')).toHaveCount(0)
    })
  })
})

test('opening the view of a notification that does not exist shows the standard page not found with status 404', async ({
  page
}) => {
  const response = await page.goto(
    `${BASE}/notifications/GBN-0000-0000-0000/notification-view`
  )

  expect(response.status()).toBe(404)
  await expect(
    page.getByRole('heading', { level: 1, name: '404', exact: true })
  ).toBeVisible()
  await expect(page.getByText('Page not found')).toBeVisible()
})
