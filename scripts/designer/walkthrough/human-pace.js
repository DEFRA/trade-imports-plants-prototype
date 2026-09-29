/* global document, sessionStorage, window */
/**
 * The browser side of human pacing: a small overlay (a cursor that glides to
 * each control, and a highlight ring before it is used) plus the hooks
 * `scripts/designer/show/walk.js` and `scripts/designer/show/drive.js` call
 * while walking a page. Every sleep here runs on the Node side
 * (`node:timers/promises`), never `page.waitForTimeout`, so the video still
 * records the pause but the trace's action list is not filled with "Wait for
 * timeout" rows.
 *
 * No unit test: the walkthrough run itself, watched by eye, is the proof
 * (see `proof.md`).
 */
import { setTimeout as sleep } from 'node:timers/promises'

import { keyDelayFor, readingTimeMs } from './pace.js'

/**
 * Runs inside the browser, injected by `installCursor`. Self-contained: it
 * must not close over anything outside itself (every name it needs is
 * declared inside it), because Playwright stringifies this function and
 * evaluates the source directly in the page — a reference to a Node-side
 * `const` above would be a `ReferenceError` there, not the value it holds
 * here. Styles are set through the CSSOM only (`element.style.x = …`), which
 * still counts as an inline style under the prototype's CSP (`style-src
 * 'self'`) and is blocked without `bypassCSP: true` on the walkthroughs
 * project — confirmed by running a walkthrough with it left off, which
 * failed every story on a console CSP violation. See playwright.config.js.
 */
const overlayScript = () => {
  if (window.__walkthroughOverlay) {
    return
  }

  const storageKey = 'walkthroughCursorPosition'
  const cursor = document.createElement('div')
  cursor.setAttribute('data-walkthrough-overlay', 'cursor')
  cursor.setAttribute('aria-hidden', 'true')
  Object.assign(cursor.style, {
    position: 'fixed',
    zIndex: '2147483647',
    pointerEvents: 'none',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: '#0b0c0c',
    border: '2px solid #ffffff',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.4)',
    transform: 'translate(-50%, -50%)',
    transition: 'transform 80ms ease-out',
    left: '-100px',
    top: '-100px'
  })

  const ring = document.createElement('div')
  ring.setAttribute('data-walkthrough-overlay', 'highlight')
  ring.setAttribute('aria-hidden', 'true')
  Object.assign(ring.style, {
    position: 'fixed',
    zIndex: '2147483646',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    border: '3px solid #ffdd00',
    borderRadius: '4px',
    display: 'none'
  })

  const mount = () => document.body.append(cursor, ring)
  if (document.body) {
    mount()
  } else {
    document.addEventListener('DOMContentLoaded', mount, { once: true })
  }

  const place = (x, y) => {
    cursor.style.left = `${x}px`
    cursor.style.top = `${y}px`
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (saved) {
      place(saved.x, saved.y)
    }
  } catch {
    // sessionStorage can be unavailable (a private window, say): the cursor
    // starts off-screen and catches up on the first mousemove instead.
  }

  document.addEventListener(
    'mousemove',
    (event) => {
      place(event.clientX, event.clientY)
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ x: event.clientX, y: event.clientY })
        )
      } catch {
        // A remembered position is a nicety, not a requirement.
      }
    },
    true
  )

  document.addEventListener(
    'mousedown',
    () => {
      cursor.style.transform = 'translate(-50%, -50%) scale(0.7)'
      setTimeout(() => {
        cursor.style.transform = 'translate(-50%, -50%) scale(1)'
      }, 120)
    },
    true
  )

  window.__walkthroughOverlay = {
    highlight(rect) {
      if (!rect) {
        ring.style.display = 'none'
        return
      }
      const pad = 4
      Object.assign(ring.style, {
        display: 'block',
        left: `${rect.x - pad}px`,
        top: `${rect.y - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`
      })
    }
  }
}

/**
 * Installs the cursor and highlight overlay on every document this context
 * opens. Call once per browser context, before signing in.
 *
 * The walkthroughs project runs with `bypassCSP: true`, so the overlay's
 * CSSOM styles are not blocked; see the comment there for why. Never turn
 * that on for any other project, because it changes what the page is
 * allowed to do.
 *
 * @param {import('@playwright/test').BrowserContext} context
 */
export const installCursor = (context) => context.addInitScript(overlayScript)

const wordsShown = async (page) => {
  try {
    const text = await page.locator('#main-content').first().innerText()
    return text.split(/\s+/).filter((word) => word !== '').length
  } catch {
    return 0
  }
}

const highlight = async (page, locator, settings) => {
  const box = await locator.boundingBox()
  if (!box) {
    return
  }
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
    steps: settings.cursorSteps
  })
  await page
    .evaluate((rect) => window.__walkthroughOverlay?.highlight(rect), box)
    .catch(() => undefined)
  await sleep(settings.highlightMs)
}

/**
 * The pacing hooks a walkthrough step calls while it walks one page. Every
 * hook is async and safe to await even when the element it is given has
 * gone (a hidden field, a page that has already moved on).
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} settings - one of `PACES` (see `pace.js`).
 * @returns {{ settle: () => Promise<void>, linger: (role?: string) =>
 *   Promise<void>, approach: (locator: object) => Promise<void>, type:
 *   (locator: object, value: string) => Promise<void>, choose: (locator:
 *   object) => Promise<void>, beforePress: (button: object) =>
 *   Promise<void> }}
 */
export const createPace = (page, settings) => {
  const settle = () => page.waitForLoadState('load').catch(() => undefined)

  const linger = async (role = 'page') => {
    const words = await wordsShown(page)
    await sleep(readingTimeMs(words, settings, role))
  }

  const approach = async (locator) => {
    await locator
      .evaluate((element) =>
        element.scrollIntoView({ block: 'center', behavior: 'smooth' })
      )
      .catch(() => undefined)
    await sleep(settings.scrollSettleMs)
    await highlight(page, locator, settings)
  }

  const type = async (locator, value) => {
    await approach(locator)
    await locator.click()
    await locator.fill('')
    await locator.pressSequentially(String(value), {
      delay: keyDelayFor(value, settings)
    })
    await sleep(settings.afterChoiceMs)
  }

  const choose = async (locator) => {
    await approach(locator)
    await locator.check()
    await sleep(settings.afterChoiceMs)
  }

  const beforePress = async (button) => {
    await approach(button)
    await sleep(settings.beforePressMs)
  }

  return { settle, linger, approach, type, choose, beforePress }
}
