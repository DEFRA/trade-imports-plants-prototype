import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'

import { config } from '../../config/config.js'
import { createLogger } from '../common/helpers/logging/logger.js'

/** Where designer data is kept, relative to the repo root. `.cache` is already
 * git-ignored, and nodemon only watches `src/`, so writing here never restarts
 * the prototype. */
export const DATA_DIR = path.join('.cache', 'designer', 'data')

const JSON_INDENT = 2

/**
 * Whether designer data is written to disk.
 *
 * Only on a designer's own computer (`npm run dev` sets
 * `NODE_ENV=development`), and never in the clean-room runs: the Playwright
 * suite starts its own server with `PROTOTYPE_SEED=false` and expects every
 * dashboard to start empty, and `designer:show` sets `PROTOTYPE_PERSIST=false`
 * so its private copy never touches a designer's saved data.
 * `PROTOTYPE_PERSIST=false` turns it off by hand.
 *
 * @param {object} [env] - the environment to read, `process.env` by default.
 * @returns {boolean} true when data should survive a restart.
 */
export const persistenceEnabled = (env = process.env) =>
  env.NODE_ENV === 'development' &&
  env.PROTOTYPE_PERSIST !== 'false' &&
  env.PROTOTYPE_SEED !== 'false'

/** The folder designer data lives in for this checkout. */
export const dataDir = () => path.join(config.get('root'), DATA_DIR)

/**
 * The file one set's data (or one stub store's data in that set) lives in.
 *
 * @param {string} dir - the data folder.
 * @param {string} setId - the set the data belongs to.
 * @param {string} [name] - the stub store, or nothing for the set's records.
 * @returns {string} `<dir>/<setId>.json` or `<dir>/<setId>.<name>.json`.
 */
export const dataFile = (dir, setId, name) =>
  path.join(dir, name ? `${setId}.${name}.json` : `${setId}.json`)

/**
 * Reads a JSON file written by `writeJson`.
 *
 * A missing file is the normal first-run case. A file that no longer parses
 * is reported and treated as missing, so a bad file can never stop the
 * prototype starting; the next save replaces it.
 *
 * @param {string} file - the file to read.
 * @returns {*} the parsed value, or null when there is nothing usable.
 */
export const readJson = (file) => {
  if (!existsSync(file)) {
    return null
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    createLogger().warn(
      `Ignoring saved designer data in ${file}: ${error.message}`
    )
    return null
  }
}

/**
 * Writes a JSON file whole, through a temporary file and a rename, so a
 * restart part-way through a save leaves the old file rather than half a file.
 *
 * @param {string} file - the file to write.
 * @param {*} value - anything JSON can hold.
 */
export const writeJson = (file, value) => {
  mkdirSync(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify(value, null, JSON_INDENT)}\n`)
  renameSync(temporary, file)
}

/** Deletes a saved file, if there is one. */
export const removeFile = (file) => {
  rmSync(file, { force: true })
}
