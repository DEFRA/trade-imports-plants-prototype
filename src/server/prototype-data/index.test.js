import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { withSetContext } from '../app/shared/set-context.js'
import { PORTS } from '../app/services/ports/stub.js'
import { STUB_BOOK } from '../app/services/address-book/stub/index.js'
import * as ports from '../app/services/ports/index.js'
import * as countries from '../app/services/countries/index.js'
import * as addressBook from '../app/services/address-book/index.js'
import {
  checkOverlays,
  extraParties,
  extraPorts,
  useOverlayRoot,
  withExtraPorts
} from './index.js'

const SET_ID = 'plants-overlay-test'
const EVERY_SET = '_all'
const PORTS_FILE = 'ports.json'
const COUNTRIES_FILE = 'countries.json'
const ANY_ORGANISATION = 'any-organisation'

const writeOverlay = (root, folder, file, rows) => {
  mkdirSync(join(root, folder), { recursive: true })
  writeFileSync(
    join(root, folder, file),
    typeof rows === 'string' ? rows : JSON.stringify(rows)
  )
}

const EVERY_SET_PORT = { code: 'GB XAL', name: 'Every Set Port' }
const SET_PORT = { code: 'GB XSE', name: 'Set Only Port' }
const PARTY = {
  id: 'green-leaf-imports-ltd',
  name: 'Green Leaf Imports Ltd',
  addressLine1: '5 Quay Street',
  townOrCity: 'Bristol',
  postalOrZipCode: 'BS1 4DJ',
  country: 'United Kingdom'
}

describe('extra parties, ports and countries for the prototype', () => {
  let root

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'prototype-data-'))
    useOverlayRoot(root)
  })

  afterEach(() => {
    useOverlayRoot()
  })

  describe('with no overlay files', () => {
    it('Should add nothing, so the stub services serve exactly their own rows', async () => {
      expect(extraPorts()).toEqual([])
      expect(await ports.list()).toHaveLength(PORTS.length)
      expect(checkOverlays()).toEqual({
        problems: [],
        counts: { parties: 0, ports: 0, countries: 0 }
      })
    })
  })

  describe('with rows for every set and for one set', () => {
    beforeEach(() => {
      writeOverlay(root, EVERY_SET, PORTS_FILE, [EVERY_SET_PORT])
      writeOverlay(root, SET_ID, PORTS_FILE, [SET_PORT])
    })

    it('Should put the stub rows first, then every set’s rows, then the set’s own', async () => {
      const listed = await withSetContext(SET_ID, async () => [
        ...(await ports.list())
      ])

      expect(listed.slice(0, PORTS.length)).toEqual(PORTS)
      expect(listed.slice(PORTS.length)).toEqual([EVERY_SET_PORT, SET_PORT])
    })

    it('Should leave a set’s own rows out of every other set', async () => {
      const elsewhere = await withSetContext('another-set', async () => [
        ...(await ports.list())
      ])

      expect(elsewhere.slice(PORTS.length)).toEqual([EVERY_SET_PORT])
    })

    it('Should label and offer an extra port the way it labels a stub one', async () => {
      await withSetContext(SET_ID, async () => {
        expect(await ports.label(SET_PORT.code)).toBe('Set Only Port (GB XSE)')
        expect(await ports.portOptions()).toContainEqual({
          value: SET_PORT.code,
          text: 'Set Only Port (GB XSE)'
        })
      })
    })

    it('Should count the rows it found', () => {
      expect(checkOverlays().counts.ports).toBe(2)
    })
  })

  describe('parties', () => {
    beforeEach(() => {
      writeOverlay(root, SET_ID, 'parties.json', [PARTY])
    })

    it('Should shape an extra party exactly like a stub address-book record', () => {
      const [record] = withSetContext(SET_ID, () => extraParties())

      expect(Object.keys(record)).toEqual(Object.keys(STUB_BOOK[0]))
      expect(Object.keys(record.address)).toEqual(
        Object.keys(STUB_BOOK[0].address)
      )
      expect(record).toMatchObject({
        id: PARTY.id,
        name: PARTY.name,
        address: { townOrCity: 'Bristol', country: 'United Kingdom' }
      })
    })

    it('Should find an extra party in the address book search after the stub parties', async () => {
      const found = await withSetContext(SET_ID, () =>
        addressBook.search(ANY_ORGANISATION, { query: 'green leaf' })
      )
      const everything = await withSetContext(SET_ID, () =>
        addressBook.search(ANY_ORGANISATION, {
          page: Math.ceil((STUB_BOOK.length + 1) / addressBook.PAGE_SIZE)
        })
      )

      expect(found.results.map((record) => record.id)).toEqual([PARTY.id])
      expect(everything.total).toBe(STUB_BOOK.length + 1)
      expect(everything.results.at(-1).id).toBe(PARTY.id)
    })

    it('Should look up an extra party by its id', async () => {
      const record = await withSetContext(SET_ID, () =>
        addressBook.party(ANY_ORGANISATION, PARTY.id)
      )

      expect(record.name).toBe(PARTY.name)
    })
  })

  describe('countries', () => {
    beforeEach(() => {
      writeOverlay(root, EVERY_SET, COUNTRIES_FILE, [
        { code: 'XK', name: 'Kosovo' }
      ])
    })

    it('Should offer an extra country as an origin and read its name back', async () => {
      expect(await countries.originCountries()).toContainEqual({
        value: 'XK',
        text: 'Kosovo'
      })
      expect(await countries.originLabel('XK')).toBe('Kosovo')
      expect(await countries.countryCodeOf('Kosovo')).toBe('XK')
    })
  })

  describe('rows written wrongly', () => {
    it('Should name the file, the row and what is missing', () => {
      writeOverlay(root, EVERY_SET, PORTS_FILE, [{ code: 'GB XNO' }])

      expect(() => extraPorts()).toThrow(
        "src/server/prototype-data/_all/ports.json row 1 has no 'name'"
      )
    })

    it('Should refuse a code the stub already uses', () => {
      writeOverlay(root, EVERY_SET, PORTS_FILE, [
        { code: PORTS[0].code, name: 'Twin' }
      ])

      expect(() => extraPorts()).toThrow(
        `uses '${PORTS[0].code}', which already exists`
      )
    })

    it('Should refuse a set row that repeats an every-set row', () => {
      writeOverlay(root, EVERY_SET, PORTS_FILE, [EVERY_SET_PORT])
      writeOverlay(root, SET_ID, PORTS_FILE, [EVERY_SET_PORT])

      expect(() => withSetContext(SET_ID, () => extraPorts())).toThrow(
        'already exists'
      )
    })

    it('Should refuse a field the stub rows do not have', () => {
      writeOverlay(root, SET_ID, 'parties.json', [{ ...PARTY, vat: '123' }])

      expect(() => withSetContext(SET_ID, () => extraParties())).toThrow(
        "has a field called 'vat'"
      )
    })

    it('Should say plainly when a file is not valid JSON', () => {
      writeOverlay(root, EVERY_SET, COUNTRIES_FILE, '[{ "code": "XK" ')

      expect(checkOverlays().problems).toEqual([
        expect.stringContaining(
          'src/server/prototype-data/_all/countries.json is not valid JSON'
        )
      ])
    })

    it('Should refuse a country code that is not two capital letters', () => {
      writeOverlay(root, EVERY_SET, COUNTRIES_FILE, [
        { code: 'Kosovo', name: 'Kosovo' }
      ])

      expect(checkOverlays().problems[0]).toContain(
        'a country code is two capital letters'
      )
    })
  })

  it('Should keep the stub rows read-only', () => {
    const view = withExtraPorts([...PORTS])

    expect(() => {
      view.push({ code: 'GB NEW', name: 'New' })
    }).toThrow('read-only')
  })
})
