const PAGE_MOVED_MESSAGES = [
  /Execution context was destroyed/,
  /Target page, context or browser has been closed/,
  /Frame was detached/i
]

const isPageMoved = (err) =>
  err?.name === 'TimeoutError' ||
  PAGE_MOVED_MESSAGES.some((pattern) => pattern.test(err?.message ?? ''))

/**
 * Waits for a Playwright call that only polishes a page, such as a wait for
 * the network to go quiet or a highlight drawn on it.
 *
 * @template T
 * @param {Promise<T>} pending - the Playwright call.
 * @param {T} fallback - what to give back when the call cannot finish.
 * @returns {Promise<T>} the call's own value, or `fallback` when it timed
 *   out or the page navigated, closed or lost its frame first.
 * @throws whatever else the call rejects with.
 */
export const valueUnlessPageMoved = async (pending, fallback) => {
  try {
    return await pending
  } catch (err) {
    if (isPageMoved(err)) {
      return fallback
    }
    throw err
  }
}
