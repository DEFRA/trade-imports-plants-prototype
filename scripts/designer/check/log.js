/**
 * The check's raw log: everything each step printed, in full, under a
 * heading per step. It lives in .cache/designer/check/, which git ignores.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

export const LOG_FOLDER = '.cache/designer/check'

/** A file-name-safe timestamp, for example 2026-09-27T10-11-12. */
export const stampOf = (date) =>
  date
    .toISOString()
    .replace(/\.\d+Z$/, '')
    .replaceAll(':', '-')

/**
 * @param {{root: string, now?: Date}} options
 * @returns {{path: string, write: (title: string, text: string) => void}}
 * `path` is repo-relative.
 */
export const createLog = ({ root, now = new Date() }) => {
  const relative = `${LOG_FOLDER}/${stampOf(now)}.log`
  const absolute = path.join(root, relative)
  mkdirSync(path.dirname(absolute), { recursive: true })
  appendFileSync(absolute, `designer:check log, ${now.toISOString()}\n`)
  return {
    path: relative,
    write: (title, text) => {
      appendFileSync(
        absolute,
        `\n===== ${title} =====\n${text.trim() || '(nothing printed)'}\n`
      )
    }
  }
}
