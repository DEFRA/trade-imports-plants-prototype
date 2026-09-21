import { describe, expect, it } from 'vitest'

import { copy } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

describe('delete-notification copy module', () => {
  it('Should keep every copy value non-empty', () => {
    for (const [key, value] of Object.entries(copy)) {
      expect(typeof value, `${key} must be a string`).toBe('string')
      expect(value.trim().length, `${key} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('Should carry the four spec strings verbatim', () => {
    expect(copy).toEqual({
      title: 'Delete this notification?',
      body: 'This cannot be undone.',
      confirmButton: 'Yes, delete notification',
      noLink: 'No, return to dashboard'
    })
  })

  it('Should carry the animals machine-draft Welsh for the same four leaves', () => {
    expect(cy).toEqual({
      title: "Dileu'r hysbysiad hwn?",
      body: 'Ni ellir dadwneud hyn.',
      confirmButton: "Iawn, dileu'r hysbysiad",
      noLink: "Na, dychwelyd i'r dangosfwrdd"
    })
  })
})
