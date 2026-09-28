import { describe, expect, it } from 'vitest'

import { addressPath, addressPattern, missingFilesNote } from './capture.js'

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
