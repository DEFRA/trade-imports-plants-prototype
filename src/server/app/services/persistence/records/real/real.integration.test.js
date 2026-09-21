import { beforeAll, describe, expect, it } from 'vitest'
import { records } from './index.js'
import {
  AMEND,
  DRAFT,
  SUBMITTED
} from '../../../../engine/persistence/records.js'
import { runsIt } from '../../it-mode.js'
import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { projectAnswers } from '../../../../bridge/fulfilments/index.js'
import { encodeEvaluatorFulfilments } from '../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../mapper.js'
import {
  BOUNDED_MODE_ONE,
  BOUNDED_TYPE_ONE,
  BRANCH_B,
  CATEGORY_ONE,
  compositeBlockValue,
  dateValue,
  MODE_ALPHA,
  SELECTOR_ALPHA,
  TAG_ONE,
  TOGGLE_YES,
  VALUE_ONE,
  VALUE_TWO,
  VARIANT_ONE
} from '../../../../../../../test/fixtures/index.js'

// Gated integration test for the option-e REAL adapter and its two backend
// resources. The default hermetic run skips it. Run against the matching
// backend worktree with:
//
//   HIGH_RISK_PLANTS_IT=real npm test -- real.integration

const backendBaseUrl =
  process.env.TRADE_IMPORTS_PLANTS_BACKEND_URL ?? 'http://localhost:8091'
const notificationsUrl = `${backendBaseUrl}/notifications`

const replaceAnswers = (journeyId, answers) =>
  records.replaceFulfilment(journeyId, assembleFulfilments(answers))
const answersOf = (journey) => projectAnswers(journey.fulfilment)
const json = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`)
  }
  return response.json()
}

// The real adapter receives the agreed plants reference format from the backend.
const REF_PATTERN = /^GBN-HRP-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/
const UNKNOWN_REFERENCE = 'GBN-HRP-99-ZZZZZZ'

const answers = {
  scalarField: VALUE_ONE,
  statusToggle: TOGGLE_YES,
  statusFlipField: VALUE_TWO,
  branchSelector: BRANCH_B,
  branchBCField: VALUE_ONE,
  branchBDField: VALUE_TWO,
  modeSelector: MODE_ALPHA,
  modeGatedList: [VALUE_ONE, VALUE_TWO],
  textFieldOne: 'text-one',
  textFieldTwo: 'text-two',
  variantSelector: VARIANT_ONE,
  variantOneBlock: compositeBlockValue('variant-one'),
  boundedCollection: [
    {
      boundedItemType: BOUNDED_TYPE_ONE,
      boundedItemMode: BOUNDED_MODE_ONE,
      boundedItemReference: 'reference-one',
      boundedItemDate: dateValue(),
      boundedItemUploadId: 'upload-1',
      boundedItemFilename: 'file-one.pdf'
    }
  ],
  itemCollection: [
    {
      itemSelector: SELECTOR_ALPHA,
      itemCategory: CATEGORY_ONE,
      itemTags: [TAG_ONE],
      itemGatedField: '3',
      itemCount: 5,
      nestedCollection: [{ nestedGatedFieldA: 'A-1' }]
    }
  ]
}

describe.skipIf(!runsIt('real'))(
  'real records adapter over the live option-e backend',
  () => {
    beforeAll(async () => {
      try {
        // Reachability probe — any HTTP response confirms the stack is up.
        await fetch(`${notificationsUrl}?page=1`)
      } catch (cause) {
        throw new Error(
          `Backend not reachable at ${backendBaseUrl} — start the matching stack before running this integration test.`,
          { cause }
        )
      }
    })

    it('Should mint an empty canonical journey and load it directly', async () => {
      const created = await records.create()

      expect(created.journeyId).toMatch(REF_PATTERN)
      expect(created.status).toBe(DRAFT)
      expect(created.submittedAt).toBeNull()
      expect(created.fulfilment).toEqual({})

      const loaded = await records.load({ journeyId: created.journeyId })
      expect(loaded).toEqual(created)
    })

    it('Should round-trip canonical fulfilment and store the current-notification projection from it', async () => {
      const { journeyId } = await records.create()
      const snapshot = assembleFulfilments(answers)

      const saved = await records.replaceFulfilment(journeyId, snapshot)
      const loaded = await records.load({ journeyId })
      const canonical = await json(
        `${notificationsUrl}/${journeyId}/fulfilments`
      )
      const listPage = await json(
        `${notificationsUrl}?referenceNumber=${journeyId}`
      )
      const current = listPage.content[0]

      expect(saved.fulfilment).toEqual(snapshot)
      expect(loaded.fulfilment).toEqual(snapshot)
      expect(canonical).toMatchObject({
        id: journeyId,
        fulfilments: encodeEvaluatorFulfilments(snapshot)
      })
      expect(current).toMatchObject(
        fulfilmentToNotification(snapshot, journeyId)
      )
      expect(answersOf(loaded).boundedCollection).toEqual(
        answers.boundedCollection
      )
      expect(answersOf(loaded).itemCollection[0].nestedCollection).toEqual(
        answers.itemCollection[0].nestedCollection
      )
    })

    it('Should whole-replace the canonical snapshot so removed values stay removed', async () => {
      const { journeyId } = await records.create()

      await replaceAnswers(journeyId, {
        scalarField: VALUE_ONE,
        optionalScalarField: 'optional-one'
      })
      await replaceAnswers(journeyId, { scalarField: VALUE_TWO })

      const loaded = await records.load({ journeyId })
      expect(answersOf(loaded).scalarField).toBe(VALUE_TWO)
      expect(answersOf(loaded).optionalScalarField).toBeUndefined()
    })

    it('Should submit and amend through the canonical lifecycle', async () => {
      const { journeyId } = await records.create()
      await replaceAnswers(journeyId, { scalarField: VALUE_ONE })

      expect((await records.finalise(journeyId)).status).toBe(SUBMITTED)
      expect((await records.load({ journeyId })).status).toBe(SUBMITTED)
      await expect(
        replaceAnswers(journeyId, { scalarField: VALUE_TWO })
      ).rejects.toThrow(/is submitted — writes blocked/)

      const amended = await records.amend(journeyId)
      expect(amended.status).toBe(AMEND)
      expect(amended.submittedAt).toBeNull()
      await expect(
        replaceAnswers(journeyId, { scalarField: VALUE_TWO })
      ).resolves.toMatchObject({ status: AMEND })
    })

    it('Should return undefined and has=false for an unknown exact id', async () => {
      expect(
        await records.load({ journeyId: UNKNOWN_REFERENCE })
      ).toBeUndefined()
      expect(await records.has(UNKNOWN_REFERENCE)).toBe(false)
    })
  }
)
