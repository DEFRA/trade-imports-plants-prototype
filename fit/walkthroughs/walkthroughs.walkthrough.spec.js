import process from 'node:process'

import { expect, test } from '@playwright/test'

import { signIn } from '../sign-in.js'
import {
  ERROR_STATE_NOTES,
  ExampleStopped,
  answerStep,
  arriveAtStep,
  canShowErrors,
  captureErrors,
  goTo,
  send,
  startOnScreen,
  walkOnFromHub
} from '../../scripts/designer/show/drive.js'
import { fileSafe } from '../../scripts/designer/show/manifest.js'
import { journeyPath } from '../../scripts/designer/show/steps.js'
import { pageHeading, primaryButton } from '../../scripts/designer/show/walk.js'
import {
  createPace,
  installCursor
} from '../../scripts/designer/walkthrough/human-pace.js'
import {
  PACES,
  paceFromEnv,
  roleOfStep
} from '../../scripts/designer/walkthrough/pace.js'
import {
  WALKTHROUGH_TAG,
  onlySetsFrom,
  planWalkthroughs,
  readSets,
  setTag
} from '../../scripts/designer/walkthrough/plan.js'

/**
 * The walkthrough report: documentation, not a gate.
 *
 * Every set with a journey gets a `describe`, and every one of its labelled
 * examples a `test`, generated here each run from the set's own examples
 * (src/server/prototype-seed/scenarios/) and live pages. Nothing is checked
 * in per set, so a new design release is walked the first time it runs.
 * Each page is one step, named by the page's own heading, with a picture of
 * the page attached. The video and trace come from the `walkthroughs`
 * project in playwright.config.js, which only exists when
 * PROTOTYPE_WALKTHROUGHS=true (`npm run designer:walkthrough` sets it).
 *
 * A story only fails when a page refuses its answers or a notification cannot
 * be started. A page whose form will not move on from the screen has its
 * answers sent directly instead, and the test says so in a `Sent directly`
 * note. Accessibility is checked by the journeys project, not here.
 */

const PICTURE_QUALITY = 70
const HIDE_OVERLAY_STYLE = '[data-walkthrough-overlay]{display:none!important}'
const HTTP_ERROR = 400
const CHECK_ANSWERS = 'notification-view'
const AFTER_SENDING = [CHECK_ANSWERS, 'declaration', 'confirmation']
const STOPS_HERE = ' (the story stops here, left to fill in)'
const READY_TO_SEND = ' (ready to check and send)'
const AFTERWARDS = ' (afterwards)'
const EMPTY_FORM_STEP = 'What it says when nothing is filled in'

const plan = planWalkthroughs({
  sets: readSets(),
  only: onlySetsFrom(process.env.WALKTHROUGH_SETS)
})

// Read once: every test in this file walks at the same pace, and an unknown
// value's warning is worth printing once, not once per story.
const paceSetting = paceFromEnv(process.env.WALKTHROUGH_PACE)
if (paceSetting.warning) {
  console.warn(paceSetting.warning)
}

const FEATURED_TAG = 'featured'

const annotationsFor = (setId, story) => [
  ...(story.story ? [{ type: 'Story', description: story.story }] : []),
  ...(story.kind === 'example'
    ? [
        {
          type: 'Example link',
          description: `/examples/${setId}/${story.slug}`
        }
      ]
    : []),
  ...(story.fixture
    ? [{ type: 'Answers from', description: story.fixture }]
    : []),
  ...(story.madeBy
    ? [
        {
          type: 'Made by',
          description: `${story.madeBy} in the example data`
        }
      ]
    : []),
  ...(story.featured !== null && story.featured !== undefined
    ? [
        { type: 'Featured', description: String(story.featured) },
        { type: 'Headline', description: story.headline }
      ]
    : [])
]

const tagsFor = (setId, story) => [
  WALKTHROUGH_TAG,
  setTag(setId),
  ...(story.featured !== null && story.featured !== undefined
    ? [`@${FEATURED_TAG}`]
    : [])
]

/**
 * Gathers what went wrong on each page: errors the browser logged, errors in
 * the page's own scripts, and pages or files the prototype could not give.
 * A refused form answer (a 400 after sending) is the page working, so only
 * addresses opened with GET count.
 */
const watchHealth = (page) => {
  const health = { where: 'the start', problems: [] }
  const note = (text) => health.problems.push(`${health.where}: ${text}`)
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      !message.text().startsWith('Failed to load resource')
    ) {
      note(message.text())
    }
  })
  page.on('pageerror', (error) => note(error.message))
  page.on('response', (response) => {
    const request = response.request()
    if (
      response.status() >= HTTP_ERROR &&
      request.method() === 'GET' &&
      request.resourceType() !== 'fetch'
    ) {
      note(`${new URL(response.url()).pathname} answered ${response.status()}`)
    }
  })
  return health
}

/**
 * One page of the story as a step: named by the page's own heading, paused
 * on so the video lingers, pictured, checked, then `action` (fill in and
 * send, or nothing on the story's last page).
 */
const pageStep = async (
  walk,
  { key, suffix = '', action = async () => {} }
) => {
  const { page } = walk
  walk.count += 1
  const number = String(walk.count).padStart(2, '0')
  const heading = (await pageHeading(page)) ?? key
  walk.health.where = heading
  await test.step(`${walk.count}. ${heading}${suffix}`, async () => {
    await walk.pace.settle()
    await walk.pace.linger(roleOfStep(key))
    await picture(walk, `${number}-${fileSafe(key)}`, `${number} ${heading}`)
    await expect
      .soft(page.locator('#main-content'), `${heading} has its main content`)
      .toBeVisible()
    await action()
  })
}

const picture = async (walk, fileName, name) => {
  const file = walk.testInfo.outputPath(`${fileName}.jpg`)
  await walk.page.screenshot({
    path: file,
    fullPage: true,
    type: 'jpeg',
    quality: PICTURE_QUALITY,
    style: HIDE_OVERLAY_STYLE
  })
  await walk.testInfo.attach(name, { path: file, contentType: 'image/jpeg' })
}

const annotate = (walk, type, description) =>
  walk.testInfo.annotations.push({ type, description })

/** Sends the page empty first, and pictures the error summary it shows. */
const showErrorState = async (walk, key) => {
  if (!canShowErrors(key, { landingKey: 'dashboard' })) {
    return
  }
  const outcome = await captureErrors(walk.page, {
    pace: walk.pace,
    onErrors: async (errors) => {
      await test.step(EMPTY_FORM_STEP, async () => {
        await walk.pace.linger('errors')
        await picture(
          walk,
          `${String(walk.count).padStart(2, '0')}-${fileSafe(key)}-errors`,
          `${walk.count} ${EMPTY_FORM_STEP}`
        )
      })
      annotate(walk, 'Error messages', `${key}: ${errors.join('; ')}`)
    }
  })
  if (outcome === 'moved' || outcome === 'nothing') {
    annotate(walk, 'No error state', `${key}: ${ERROR_STATE_NOTES[outcome]}`)
  }
}

const walkSteps = async (walk, story, journeyId) => {
  for (const step of story.steps) {
    await arriveAtStep(walk.session, step, journeyId)
    await pageStep(walk, {
      key: step.slug,
      action: async () => {
        if (story.kind === 'errors') {
          await showErrorState(walk, step.slug)
        }
        await answerStep(walk.session, step, journeyId, {
          example: story.name,
          pace: walk.pace,
          onNote: (text) => annotate(walk, 'Sent directly', text)
        })
      }
    })
  }
}

const walkToCheckAnswers = async (walk, journeyId, suffix) => {
  await goTo(walk.session, journeyPath(walk.session.setBase, journeyId))
  await pageStep(walk, { key: 'task-list' })
  await goTo(
    walk.session,
    journeyPath(walk.session.setBase, journeyId, CHECK_ANSWERS)
  )
  await pageStep(walk, { key: CHECK_ANSWERS, suffix })
}

const walkToConfirmation = async (walk, journeyId) => {
  await goTo(walk.session, journeyPath(walk.session.setBase, journeyId))
  await pageStep(walk, { key: 'task-list' })
  let stuck = null
  const moved = await walkOnFromHub(walk.session, journeyId, {
    after: AFTER_SENDING,
    pace: walk.pace,
    onPage: (key) => pageStep(walk, { key }),
    onNote: (text) => {
      stuck = text
    }
  })
  if (!moved) {
    throw new ExampleStopped(stuck)
  }
}

const buttonFor = (page, journeyId, slug) =>
  page
    .locator(
      `#main-content form[method="post"][action$="/${journeyId}/${slug}"]`
    )
    .locator('button:not([type="button"])')
    .first()

const pressAndWait = async (page, button, pace) => {
  const from = page.url()
  await pace.beforePress(button)
  await button.click()
  await page.waitForURL((url) => url.href !== from)
}

/**
 * Amends, cancels an amendment or deletes, the way a trader does: the
 * notification's own button on the dashboard, or else the confirm page at
 * its address, or else (with a note) sending it directly.
 */
const actionOnScreen = async (walk, journeyId, slug) => {
  const { session } = walk
  const { page, setBase } = session
  await goTo(session, setBase)
  const onDashboard = buttonFor(page, journeyId, slug)
  if ((await onDashboard.count()) > 0) {
    await pageStep(walk, {
      key: `dashboard-${slug}`,
      action: () => pressAndWait(page, onDashboard, walk.pace)
    })
    return
  }
  const address = journeyPath(setBase, journeyId, slug)
  const probe = await page.request.get(address, { maxRedirects: 0 })
  if (probe.status() === 200) {
    await goTo(session, address)
    const confirm = await primaryButton(page)
    if ((await confirm.count()) > 0) {
      await pageStep(walk, {
        key: slug,
        action: () => pressAndWait(page, confirm, walk.pace)
      })
      return
    }
  }
  annotate(walk, 'Sent directly', `${slug}: no button for it on screen`)
  const location = await send(
    session,
    address,
    {},
    {
      example: walk.storyName,
      page: slug
    }
  )
  await goTo(session, location)
}

const followUps = (story) =>
  [
    story.amend && 'amend',
    story.cancelAmend && 'cancel-amend',
    story.delete && 'delete'
  ].filter(Boolean)

const walkStory = async (walk, story) => {
  const { session } = walk
  await goTo(session, session.setBase)
  let journeyId = null
  await pageStep(walk, {
    key: 'dashboard',
    action: async () => {
      journeyId = await startOnScreen(session, story.name, { pace: walk.pace })
    }
  })
  await walkSteps(walk, story, journeyId)
  if (story.through) {
    await arriveAtStep(session, { slug: story.through }, journeyId)
    await pageStep(walk, { key: story.through, suffix: STOPS_HERE })
  } else if (story.submit) {
    await walkToConfirmation(walk, journeyId)
  } else {
    await walkToCheckAnswers(walk, journeyId, READY_TO_SEND)
  }
  for (const slug of followUps(story)) {
    await actionOnScreen(walk, journeyId, slug)
    await pageStep(walk, { key: `after-${slug}` })
  }
  await goTo(session, session.setBase)
  await pageStep(walk, { key: 'dashboard-afterwards', suffix: AFTERWARDS })
}

for (const { setId, title, stories } of plan) {
  test.describe(title, () => {
    for (const story of stories) {
      test(
        story.name,
        {
          tag: tagsFor(setId, story),
          annotation: annotationsFor(setId, story)
        },
        async ({ page, context, baseURL }, testInfo) => {
          if (story.kind === 'broken') {
            throw new Error(story.message)
          }
          const health = watchHealth(page)
          await installCursor(context)
          const walk = {
            page,
            testInfo,
            health,
            count: 0,
            storyName: story.name,
            pace: createPace(page, PACES[paceSetting.name]),
            session: { context, page, baseUrl: baseURL, setBase: `/${setId}` }
          }
          await signIn(page, {
            organisationId: `walkthrough-${setId}-${story.slug}`
          })
          await walkStory(walk, story)
          expect
            .soft(health.problems, 'Console errors or failed pages')
            .toEqual([])
        }
      )
    }
  })
}
