/**
 * Pure name derivation for a scaffolded set — no filesystem, so every shape
 * a new set id gets rewritten into is unit-testable on its own.
 */
const KEBAB_CASE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/

export const isKebabCase = (id) => KEBAB_CASE.test(id)

/** `foo-bar` -> `fooBar`, for a cookie name or an exported plugin binding. */
export const camelCase = (id) =>
  id
    .split('-')
    .map((word, index) =>
      index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join('')

/** `foo-bar` -> `Foo bar`, the same sentence case the chooser lists a set in
 * (`sets-index/controller.js`'s `displayNameFor`). */
export const sentenceCase = (id) => {
  const words = id.split('-').join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** `foo-bar` -> `FOO_BAR`, for the `SET_BASE` import alias a set's own
 * `set.js` is mounted under (mirrors `SAMPLE_JOURNEY_BASE`). */
export const screamingSnakeCase = (id) => id.split('-').join('_').toUpperCase()
