import { describe, expect, it } from 'vitest'

import {
  REFERENCE_PATTERN,
  addressPath,
  addressPattern,
  missingFilesNote,
  pinnedReferences
} from './capture.js'

describe('addressPath', () => {
  const where = { setBase: '/plants-working', journeyId: 'GBN-1' }

  it.each([
    ['/', '/'],
    [
      '/examples/plants-working/submitted',
      '/examples/plants-working/submitted'
    ],
    ['?status=submitted', '/plants-working?status=submitted'],
    ['', '/plants-working'],
    ['transporters', '/plants-working/transporters'],
    [
      'notifications/{notification}/transporter-select/add',
      '/plants-working/notifications/GBN-1/transporter-select/add'
    ]
  ])('Should read "%s" as %s', (address, expected) => {
    expect(addressPath(address, where)).toBe(expected)
  })

  it('Should answer null when the address needs a notification and there is none', () => {
    expect(
      addressPath('notifications/{notification}/origin', {
        setBase: '/plants-working',
        journeyId: null
      })
    ).toBeNull()
  })
})

describe('addressPattern', () => {
  it('Should swap the notification id for a placeholder', () => {
    expect(
      addressPattern(
        '/plants-working/notifications/GBN-HRP-26-JK2ABX/arrival-details',
        '/plants-working'
      )
    ).toBe('/plants-working/notifications/<reference>/arrival-details')
  })

  it('Should leave an address outside a notification alone', () => {
    expect(addressPattern('/plants-working', '/plants-working')).toBe(
      '/plants-working'
    )
  })
})

describe('pinnedReferences', () => {
  it('Should show the references on a page as the same stand-ins in every run, in page order', () => {
    const before = pinnedReferences(['GBN-HRP-26-RFDM62', 'GBN-HRP-26-K2ABXQ'])
    const after = pinnedReferences(['GBN-HRP-26-J047SQ', 'GBN-HRP-26-7TTW0A'])

    expect(Object.values(before)).toEqual([
      'GBN-HRP-26-EXMP01',
      'GBN-HRP-26-EXMP02'
    ])
    expect(Object.values(after)).toEqual(Object.values(before))
  })

  it('Should find a reference inside other words, and nothing else', () => {
    const text = 'Your reference number is GBN-HRP-26-RFDM62. Keep ABCDEF safe.'

    expect(text.match(REFERENCE_PATTERN)).toEqual(['GBN-HRP-26-RFDM62'])
  })

  it('Should leave a page already pinned as it is', () => {
    expect(pinnedReferences(['GBN-HRP-26-EXMP01'])).toEqual({
      'GBN-HRP-26-EXMP01': 'GBN-HRP-26-EXMP01'
    })
  })
})

describe('missingFilesNote', () => {
  it('Should say nothing when every file loaded', () => {
    expect(missingFilesNote(new Set())).toBeNull()
  })

  it('Should name up to three missing files in one sentence', () => {
    expect(
      missingFilesNote(
        new Set([
          '/assets/fonts/d.woff',
          '/assets/fonts/a.woff',
          '/assets/fonts/c.woff',
          '/assets/fonts/b.woff'
        ])
      )
    ).toBe(
      "The prototype could not give the browser 4 file(s) the pages asked for (/assets/fonts/a.woff, /assets/fonts/b.woff, /assets/fonts/c.woff and more), so the pictures may be missing fonts, styles or scripts. The pages themselves are fine; if it keeps happening, tell the prototype's maintainer."
    )
  })
})
