import { describe, expect, it } from 'vitest'

import { driveHandler } from '../../../../../../engine/test-support.js'
import { offeredForRole } from '../../../../../../services/address-book/index.js'
import { STUB_BOOK } from '../../../../../../services/address-book/stub/index.js'
import { useStubbedHighRiskPlantsJourney } from '../../test-support.js'
import { copy as pickerCopy } from './copy/copy.en.js'
import { ADDRESSES_A_PAGE, pageCountOf } from './pagination.js'
import { FIRST_PAGE } from '../../../../../../shared/paging.js'
import { DENMARK } from './test-support.js'

const pickerOn = async (get, seed, page) => {
  const result = await driveHandler(get, {
    seed: seed(),
    query: { page: String(page) }
  })
  return result.view.context.picker
}

const pickerSearchedFor = async (get, seed, query) => {
  const result = await driveHandler(get, {
    seed: seed(),
    query: { q: query }
  })
  return result.view.context.picker
}

const pageNumbersOf = (offeredCount) =>
  Array.from({ length: pageCountOf(offeredCount) }, (_, index) => index + 1)

const idsOfferedFor = (role) =>
  STUB_BOOK.filter((record) => offeredForRole(record, role)).map(
    (record) => record.id
  )

/**
 * The paging cases every address picker's GET route shares. Every picker's
 * stub list runs past one page, so each proves a second page; the no-paging
 * case comes from a search that narrows the addresses found back onto one.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - the page's name, for the describe
 * @param {Function} picker.get - the page's GET handler
 * @param {Function} picker.seed - gives the journey state the page opens on
 * @param {string} [picker.role] - the address-book role the page asks for
 * @param {number} picker.wholeCount - how many stub records this picker offers: those carrying its role, together with those carrying none
 * @param {string[]} picker.denmarkMatches - the stub record ids a "Denmark" search lists on this picker
 */
export const describePaging = ({
  pickerName,
  get,
  seed,
  role,
  wholeCount,
  denmarkMatches
}) => {
  const lastPage = pageCountOf(wholeCount)

  describe(`GET ${pickerName} — the page of results it holds`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should open on the first eight of the addresses it offers, counted against every one of them', async () => {
      const picker = await pickerOn(get, seed, FIRST_PAGE)

      expect(picker.rows).toHaveLength(ADDRESSES_A_PAGE)
      expect(picker.resultsCount).toBe(
        pickerCopy.resultsCount(ADDRESSES_A_PAGE, wholeCount)
      )
    })

    it('Should offer, across its pages, every address it offers and no other', async () => {
      const pages = await Promise.all(
        pageNumbersOf(wholeCount).map((page) => pickerOn(get, seed, page))
      )
      const ids = pages.flatMap((picker) => picker.rows.map((row) => row.id))

      expect(ids).toEqual(idsOfferedFor(role))
    })

    it('Should offer paging onward from the first page', async () => {
      const picker = await pickerOn(get, seed, FIRST_PAGE)

      expect(picker.pagination.next.href).toContain('page=2')
      expect(picker.pagination.items).toHaveLength(lastPage)
    })

    it('Should offer no paging once a search narrows the addresses found onto one page', async () => {
      const picker = await pickerSearchedFor(get, seed, DENMARK)

      expect(picker.rows.map((row) => row.id)).toEqual(denmarkMatches)
      expect(picker.pagination).toBeNull()
    })
  })
}

/**
 * The cases every address picker's GET route shares for a page it cannot
 * serve as asked.
 *
 * @param {object} picker
 * @param {string} picker.pickerName - the page's name, for the describe
 * @param {Function} picker.get - the page's GET handler
 * @param {Function} picker.seed - gives the journey state the page opens on
 * @param {number} picker.wholeCount - how many stub records this picker offers: those carrying its role, together with those carrying none
 */
export const describePageServedWhenNotAsAsked = ({
  pickerName,
  get,
  seed,
  wholeCount
}) => {
  const lastPage = pageCountOf(wholeCount)

  describe(`GET ${pickerName} — the page it serves when it cannot serve the one asked for`, () => {
    useStubbedHighRiskPlantsJourney()

    it('Should serve the last page, logged once, when the page asked for is past it', async () => {
      const pastTheLastPage = lastPage + 1
      const result = await driveHandler(get, {
        seed: seed(),
        query: { page: String(pastTheLastPage) }
      })

      expect(result.view.context.picker.page).toBe(lastPage)
      expect(result.logger.entries).toEqual([
        {
          level: 'info',
          message:
            'Address picker page is past the last page, serving the last page',
          fields: expect.objectContaining({
            requestedPage: pastTheLastPage,
            servedPage: lastPage
          })
        }
      ])
    })

    it.each(['nonsense', '3abc', '2.9', '1e3', '0', '-1'])(
      'Should serve the first page, logged once, when the page asked for is %s',
      async (asked) => {
        const result = await driveHandler(get, {
          seed: seed(),
          query: { page: asked }
        })

        expect(result.view.context.picker.page).toBe(FIRST_PAGE)
        expect(result.logger.entries).toEqual([
          {
            level: 'info',
            message:
              'Address picker page is not a page number, serving the first page',
            fields: expect.objectContaining({
              requestedPage: asked,
              servedPage: FIRST_PAGE
            })
          }
        ])
      }
    )
  })
}
