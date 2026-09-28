import * as seed from '../prototype-seed/index.js'
import * as seedRegistry from '../prototype-seed/registry.js'

/**
 * The one place the records wrapper talks to the example-data seeder
 * (`src/server/prototype-seed/`). Kept to one file, and read through namespace
 * imports with fallbacks, because the seeder changes more often than this does:
 * if one of these exports is renamed, saving carries on and only the
 * duplicate-examples guard below weakens.
 *
 * Why the wrapper needs the seeder at all: a set's examples are made on the
 * first visit after the prototype starts. When a release's data is restored
 * from disk, its examples come back with it, so the seeder must be told they
 * are already there, and which example is which (for example links), or it
 * would make a second copy of every example on every restart.
 */
const call = (source, name, fallback) =>
  typeof source[name] === 'function' ? source[name] : fallback

const none = () => []
const never = () => false
const always = () => true
const nothing = () => {}

/** Whether the seeder has made (or been told about) a set's examples. */
export const hasBeenSeeded = (setId) =>
  call(seedRegistry, 'hasBeenSeeded', never)(setId)

/** The example reference numbers every session of a set is told about. */
export const seededIds = (setId) =>
  call(seedRegistry, 'seededIdsFor', call(seed, 'seededIdsFor', none))(setId)

/** Every example the seeder made for a set, with its stable slug. */
export const seededExamples = (setId) =>
  call(
    seedRegistry,
    'seededExamplesFor',
    call(seed, 'seededExamplesFor', none)
  )(setId)

/** Tells the seeder a set's examples already exist, and which is which. */
export const recordSeeded = (setId, journeyIds, examples) => {
  call(seedRegistry, 'recordExamples', nothing)(setId, examples)
  call(seedRegistry, 'recordSeeded', nothing)(setId, journeyIds)
}

/**
 * Whether the seeder is part-way through making a set's examples.
 *
 * While it is, a save would write half a set of examples and no record of
 * which ones they are, so the wrapper waits for the next change instead.
 */
export const seedingPending = (setId) =>
  call(seed, 'isSeedingEnabled', never)() &&
  call(seed, 'hasSeeder', never)(setId) &&
  !call(seedRegistry, 'hasBeenSeeded', always)(setId)
