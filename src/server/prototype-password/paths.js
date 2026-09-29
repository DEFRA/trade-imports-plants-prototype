const HOURS_PER_DAY = 24
const MINUTES_PER_HOUR = 60
const SECONDS_PER_MINUTE = 60
const MS_PER_SECOND = 1000
const MS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND
const COOKIE_LIFETIME_DAYS = 30

export const PASSWORD_PATH = '/prototype-password'
export const SIGN_OUT_PATH = `${PASSWORD_PATH}/sign-out`
export const COOKIE_NAME = 'prototype-password'

/** How long a correct password is remembered: 30 days, as the Prototype Kit. */
export const COOKIE_TTL_MS = COOKIE_LIFETIME_DAYS * MS_PER_DAY
