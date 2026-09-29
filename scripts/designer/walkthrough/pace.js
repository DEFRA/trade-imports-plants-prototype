/**
 * The two speeds a walkthrough can run at, and the pure arithmetic that
 * turns a page's word count into a reading pause and a value's length into a
 * typing speed. No Playwright import here: `human-pace.js` is the browser
 * side that uses these numbers.
 *
 * `human` is what CI's `walkthroughs` job and `designer:walkthrough` run
 * with by default, so the recorded video and trace read as a person's own
 * pace: a glide to each control, a pause after each choice, and a moment to
 * read each new page before moving on. `fast` turns every one of those
 * pauses to zero, for a designer checking that the stories still reach the
 * end, and for CI's `release-canary`, which only needs to prove a new
 * release gets a walkthrough.
 */

export const PACES = Object.freeze({
  human: Object.freeze({
    readMsPerWord: 60,
    readBaseMs: 1500,
    read: Object.freeze({ min: 2000, max: 6000 }),
    readFinal: Object.freeze({ min: 4000, max: 8000 }),
    readErrors: Object.freeze({ min: 2500, max: 5000 }),
    scrollSettleMs: 400,
    cursorSteps: 15,
    highlightMs: 350,
    keyDelayMs: 70,
    maxTypingMs: 2500,
    afterChoiceMs: 400,
    beforePressMs: 500,
    showCursor: true
  }),
  fast: Object.freeze({
    readMsPerWord: 0,
    readBaseMs: 0,
    read: Object.freeze({ min: 0, max: 0 }),
    readFinal: Object.freeze({ min: 0, max: 0 }),
    readErrors: Object.freeze({ min: 0, max: 0 }),
    scrollSettleMs: 0,
    cursorSteps: 0,
    highlightMs: 0,
    keyDelayMs: 0,
    maxTypingMs: 0,
    afterChoiceMs: 0,
    beforePressMs: 0,
    showCursor: false
  })
})

const BOUNDS_KEY = Object.freeze({
  page: 'read',
  final: 'readFinal',
  errors: 'readErrors'
})

const clamp = (value, { min, max }) => Math.min(Math.max(value, min), max)

/**
 * How long to linger on a page before moving on, from how many words it
 * shows.
 *
 * @param {number} words - the visible words in `#main-content`.
 * @param {object} pace - one of `PACES`.
 * @param {'page'|'final'|'errors'} [role] - `final` for the confirmation
 *   page, an "after-*" page and the last dashboard; `errors` for an error
 *   summary shown on purpose. Everything else is `page`.
 * @returns {number} milliseconds.
 */
export const readingTimeMs = (words, pace, role = 'page') =>
  clamp(
    pace.readBaseMs + Number(words) * pace.readMsPerWord,
    pace[BOUNDS_KEY[role] ?? BOUNDS_KEY.page]
  )

/**
 * How fast to type one value: the pace's own per-character delay, unless the
 * value is so long that would take longer than `maxTypingMs`, in which case
 * it types faster instead of taking longer.
 *
 * @param {string} value
 * @param {object} pace - one of `PACES`.
 * @returns {number} milliseconds per character.
 */
export const keyDelayFor = (value, pace) => {
  const length = Math.max(String(value).length, 1)
  return Math.min(pace.keyDelayMs, Math.floor(pace.maxTypingMs / length))
}

/**
 * Reads `WALKTHROUGH_PACE`. An unknown value falls back to `human`, with a
 * warning the caller can print.
 *
 * @param {string|undefined} value
 * @returns {{ name: 'human'|'fast', warning: string|null }}
 */
export const paceFromEnv = (value) => {
  if (value === undefined || value === null || value === '') {
    return { name: 'human', warning: null }
  }
  if (Object.hasOwn(PACES, value)) {
    return { name: value, warning: null }
  }
  return {
    name: 'human',
    warning: `WALKTHROUGH_PACE was "${value}", which is neither "human" nor "fast". Using human pacing.`
  }
}

const FINAL_KEYS = new Set(['confirmation', 'dashboard-afterwards'])

/**
 * Which reading role a walkthrough step's page key gets: `final` for the
 * confirmation page, the dashboard shown again afterwards, and any
 * "after-*" page (amend, cancel-amend, delete); `page` for everything else.
 * A page shown to display its error messages gets `errors` directly, from
 * the caller, not from this function.
 *
 * @param {string} key
 * @returns {'page'|'final'}
 */
export const roleOfStep = (key) =>
  FINAL_KEYS.has(key) || key.startsWith('after-') ? 'final' : 'page'
