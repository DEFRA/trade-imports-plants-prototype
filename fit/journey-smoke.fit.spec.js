import { pageUrlOnWalk, pageUrlWithTrail } from './set-base.js'
import { TRAIL_START } from '../src/server/app/shared/trail.js'
import { createRequire } from 'node:module'
import { expect, test } from '@playwright/test'
import { signIn } from './sign-in.js'
import { seedFields } from './seed-fields.js'
const happyPaths = createRequire(import.meta.url)(
  '../src/server/app/sets/high-risk-plants/journeys/linear/flow/fixtures/happy-path.json'
)
import { copy as sharedCopy } from '../src/server/app/shared/copy.en.js'
import { copy as commodityCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/commodities/copy/copy.en.js'
import { copy as arrivalCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-details/copy/copy.en.js'
import { copy as statusCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/arrival-status/copy/copy.en.js'
import { copy as idsCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/identification-numbers/copy/copy.en.js'
import { copy as checkAnswersCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/check-answers/copy/copy.en.js'
import { copy as confirmationCopy } from '../src/server/app/sets/high-risk-plants/journeys/linear/features/confirmation/copy/copy.en.js'
import {
  backLink,
  chooseCountryOfOrigin,
  chooseTypeAheadOption,
  expectNoSeriousOrCriticalViolations,
  POTATO_WALK,
  saveAndContinue,
  startNotification,
  startPotatoNotification,
  submitDeclarationFromCheckAnswers
} from './high-risk-plants-journey.js'

const chooseRadio = (page, name) =>
  page.getByRole('radio', { name, exact: true }).check()

const fillCommodity = async (page, fields) => {
  if (fields.index === undefined) {
    await chooseRadio(page, commodityCopy.categoryLabels[fields.category])
    return
  }
  for (const [field, value] of Object.entries(fields)) {
    if (field === 'index' || field === 'category') continue
    if (field === 'genus') {
      await chooseTypeAheadOption(page, {
        label: commodityCopy.details.fields.genus.label,
        optionName: commodityCopy.genusLabels[value]
      })
    } else {
      await page
        .getByLabel(commodityCopy.details.fields[field].label, { exact: true })
        .fill(value)
    }
  }
}

const fillArrival = async (page, fields) => {
  const dateLabel = fields.arrivalTime
    ? arrivalCopy.dateLabels.potatoes
    : arrivalCopy.dateLabels['not-yet-arrived']
  await page.getByLabel(dateLabel, { exact: true }).fill(fields.arrivalDate)
  if (fields.arrivalTime) {
    await page
      .getByLabel(arrivalCopy.time.label, { exact: true })
      .fill(fields.arrivalTime)
    await chooseTypeAheadOption(page, {
      label: arrivalCopy.placeOfLanding.label,
      optionName: 'Port of Dover - GB DVR'
    })
  }
}

const fillSteps = {
  'commodity-type': (page, fields) =>
    chooseRadio(page, commodityCopy.typeLabels[fields.commodityType]),
  'commodities/details': fillCommodity,
  commodities: async () => {},
  origin: (page, fields, shape) =>
    chooseCountryOfOrigin(page, shape.countryName),
  'arrival-status': (page, fields) =>
    chooseRadio(page, statusCopy.statusLabels[fields.arrivalStatus]),
  'arrival-details': fillArrival,
  'destinations/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`),
  'consignors/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`),
  'identification-numbers': async (page, fields) => {
    for (const [field, value] of Object.entries(fields)) {
      await page
        .getByLabel(idsCopy.fields[field].label, { exact: true })
        .fill(value)
    }
  },
  'consignment/contact/select': (page, fields, shape) =>
    chooseRadio(page, `Select ${shape.partyName}`)
}

const answerStepAndContinue = async (page, step, shape) => {
  await fillSteps[step.slug](page, seedFields(step), shape)
  const button =
    step.slug === 'commodities/details' && step.fields.index === undefined
      ? commodityCopy.details.continue
      : sharedCopy.saveActions.saveAndContinue
  await page.getByRole('button', { name: button, exact: true }).click()
}

const stepUrl = (reference, step, trail) =>
  pageUrlWithTrail(
    `/notifications/${reference}/${step.slug}${step.fields.index === undefined ? '' : `\\?index=${step.fields.index}`}`,
    trail
  )

const PAGES_SAVED_WITHOUT_TRAIL_ENTRY = new Set(['commodities/details'])

const trailEntryAfterSaving = (step) =>
  PAGES_SAVED_WITHOUT_TRAIL_ENTRY.has(step.slug) ? [] : [step.slug]

for (const [name, shape] of Object.entries(happyPaths)) {
  test(`${name}: ${shape.useCase} reaches confirmation`, async ({ page }) => {
    await signIn(page)
    const reference = await startNotification(page)
    const walked = [TRAIL_START.dashboard]

    for (const step of shape.steps) {
      await test.step(step.slug, async () => {
        await expect(page).toHaveURL(stepUrl(reference, step, walked))
        await answerStepAndContinue(page, step, shape)
        walked.push(...trailEntryAfterSaving(step))
      })
    }

    await expect(page).toHaveURL(
      pageUrlWithTrail(`/notifications/${reference}/notification-view`, walked)
    )
    await expect(
      page.getByRole('heading', { name: checkAnswersCopy.title, level: 1 })
    ).toBeVisible()
    await submitDeclarationFromCheckAnswers(page, reference)
    await expect(
      page.getByRole('heading', { name: confirmationCopy.title, level: 1 })
    ).toBeVisible()
    await expect(
      page.getByText(confirmationCopy.reference, { exact: false })
    ).toContainText(reference)
    await expect(
      page.getByRole('heading', { name: confirmationCopy.late.heading })
    ).toHaveCount(shape.late ? 1 : 0)
    await expectNoSeriousOrCriticalViolations(page, `${name} confirmation`)
  })
}

const BACK_TARGETS_BY_PAGE_ON_FORWARD_WALK = {
  warePotatoes: {
    commodities: 'commodity-type',
    'arrival-details': 'origin',
    'identification-numbers': 'destinations/select',
    'consignment/contact/select': 'identification-numbers'
  },
  woodWithoutBark: {
    commodities: 'commodity-type',
    'arrival-details': 'arrival-status',
    'identification-numbers': 'consignors/select',
    'consignment/contact/select': 'identification-numbers'
  }
}

for (const [name, backTargets] of Object.entries(
  BACK_TARGETS_BY_PAGE_ON_FORWARD_WALK
)) {
  test(`${name}: Back on the commodities list, arrival details, identification numbers and contact opens the step Save and continue came from`, async ({
    page
  }) => {
    const shape = happyPaths[name]
    await signIn(page)
    const reference = await startNotification(page)
    const walked = [TRAIL_START.dashboard]

    for (const step of shape.steps) {
      const backTarget = backTargets[step.slug]
      if (backTarget) {
        await test.step(`Back from ${step.slug}`, async () => {
          await backLink(page).click()
          await expect(page).toHaveURL(
            pageUrlWithTrail(
              `/notifications/${reference}/${backTarget}`,
              walked.slice(0, -1)
            )
          )
          await page.goBack()
          await expect(page).toHaveURL(stepUrl(reference, step, walked))
        })
      }
      await answerStepAndContinue(page, step, shape)
      walked.push(...trailEntryAfterSaving(step))
    }

    await expect(page).toHaveURL(
      pageUrlWithTrail(`/notifications/${reference}/notification-view`, walked)
    )
  })
}

test('following Back and choosing Save and continue carries on to the next step', async ({
  page
}) => {
  await signIn(page)
  await startPotatoNotification(page)

  await backLink(page).click()
  await expect(page).toHaveURL(pageUrlOnWalk('origin', POTATO_WALK))

  await saveAndContinue(page).click()
  await expect(page).toHaveURL(pageUrlOnWalk('arrival-details', POTATO_WALK))
})

test('following Back from the arrival details reaches origin and then the commodities list', async ({
  page
}) => {
  await signIn(page)
  await startPotatoNotification(page)

  for (const slug of ['origin', 'commodities']) {
    await backLink(page).click()
    await expect(page).toHaveURL(pageUrlOnWalk(slug, POTATO_WALK))
  }
})
