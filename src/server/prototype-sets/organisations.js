/**
 * The organisations the chooser's "sign in as another organisation" switcher
 * offers, and the organisations the seed data (see `prototype-seed/`) is
 * seeded under.
 *
 * Real Defra ID has no fixed roster the stub could read: `?organisationId=`
 * on `/auth/stub-sign-in` (see `server/auth/stub-sign-in.js`) accepts any
 * string, defaulting to `stub-org-1`. So this is a prototype-owned registry,
 * not a mirror of anything upstream knows about — invented organisations for
 * a designer to switch between, each with a name realistic enough to demo
 * against.
 *
 * Deliberately never `stub-org-1`: every FIT spec and unit test that signs in
 * without naming an organisation (`fit/sign-in.js`'s own default) relies on
 * that organisation's dashboard starting empty. Seeding it would break every
 * one of them.
 */
export const PROTOTYPE_ORGANISATIONS = [
  { id: 'prototype-org-north', name: 'Acme Produce Ltd' },
  { id: 'prototype-org-south', name: 'Riverside Growers Ltd' }
]

export const DEFAULT_ORGANISATION_ID = PROTOTYPE_ORGANISATIONS[0].id

export const organisationName = (organisationId) =>
  PROTOTYPE_ORGANISATIONS.find(({ id }) => id === organisationId)?.name
