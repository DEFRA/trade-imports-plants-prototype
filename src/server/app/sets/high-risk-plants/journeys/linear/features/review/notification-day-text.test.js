import { describe, expect, it } from 'vitest'
import { notificationDayText } from './notification-day-text.js'

describe('notificationDayText', () => {
  it('Should show a stored instant as the long day', () => {
    expect(notificationDayText('2026-03-05T10:15:00.000Z')).toBe('5 March 2026')
  })

  it.each([undefined, null, ''])('Should give null for %j', (instant) => {
    expect(notificationDayText(instant)).toBeNull()
  })
})
