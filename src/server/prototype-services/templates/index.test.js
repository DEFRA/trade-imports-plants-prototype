import { describe, expect, it } from 'vitest'

import { withSetContext } from '../../app/shared/set-context.js'
import { clearFakesFor, describeFakes } from '../lib/registry.js'
import {
  deleteTemplate,
  saveTemplate,
  search,
  SERVICE,
  template
} from './index.js'

const RELEASE = 'plants-templates-test'
const OTHER_RELEASE = 'plants-templates-elsewhere'
const ORG = 'org-templates'
const ANSWERS = { 'obligation-uuid': 'Rosa canina' }
const WEEKLY_ROSES = 'Weekly roses'

const inRelease = (fn) => withSetContext(RELEASE, fn)

describe('#saveTemplate and #template', () => {
  it('Should save a named copy of the answers and read it back whole', async () => {
    const saved = await inRelease(() =>
      saveTemplate(ORG, {
        name: ` ${WEEKLY_ROSES} `,
        fulfilment: ANSWERS,
        fromJourneyId: 'GBN-HRP-26-ABC123'
      })
    )

    expect(saved).toMatchObject({
      id: 'weekly-roses',
      name: WEEKLY_ROSES,
      fromJourneyId: 'GBN-HRP-26-ABC123',
      fulfilment: ANSWERS
    })
    expect(await inRelease(() => template(ORG, 'weekly-roses'))).toEqual(saved)
  })

  it('Should refuse a template with no name', async () => {
    await expect(
      inRelease(() => saveTemplate(ORG, { name: '  ', fulfilment: {} }))
    ).rejects.toThrow('A template needs a name')
  })

  it('Should keep a template to the set whose questions it answers', async () => {
    await inRelease(() =>
      saveTemplate(ORG, { name: 'Only here', fulfilment: ANSWERS })
    )

    expect(
      await withSetContext(OTHER_RELEASE, () => template(ORG, 'only-here'))
    ).toBeUndefined()
  })
})

describe('#search', () => {
  it('Should list templates newest first, by name, without their answers', async () => {
    await inRelease(() =>
      saveTemplate(ORG, { name: 'Search apples', fulfilment: ANSWERS })
    )
    await inRelease(() =>
      saveTemplate(ORG, { name: 'Search apricots', fulfilment: ANSWERS })
    )

    const found = await inRelease(() => search(ORG, { query: 'search ap' }))

    expect(found.results.map((row) => row.name)).toEqual([
      'Search apricots',
      'Search apples'
    ])
    expect(found.results[0]).not.toHaveProperty('fulfilment')
  })
})

describe('#deleteTemplate and Reset', () => {
  it('Should delete one template, and Reset should empty the rest', async () => {
    await inRelease(() =>
      saveTemplate(ORG, { name: 'Delete me', fulfilment: ANSWERS })
    )
    await inRelease(() =>
      saveTemplate(ORG, { name: 'Reset me', fulfilment: ANSWERS })
    )

    expect(await inRelease(() => deleteTemplate(ORG, 'delete-me'))).toBe(true)
    expect(await inRelease(() => deleteTemplate(ORG, 'delete-me'))).toBe(false)

    clearFakesFor(RELEASE)

    expect((await inRelease(() => search(ORG))).total).toBe(0)
    expect(describeFakes()).toContainEqual(SERVICE)
  })
})
