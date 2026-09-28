/**
 * The prototype's styles and scripts (built from src/client into .public).
 * designer:show builds them only when .public is missing, incomplete or
 * older than src/client. A running `npm run dev` keeps .public up to date
 * itself, so a show run next to it does not rebuild.
 */
import { spawn } from 'node:child_process'
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readdirSync,
  statSync
} from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export const BUILT_MARKER = '.public/assets-manifest.json'

/** The newest modification time (ms) of any file under `folder`, or 0. */
export const newestModifiedTime = (folder) => {
  if (!existsSync(folder)) {
    return 0
  }
  let newest = 0
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name)
    const time = entry.isDirectory()
      ? newestModifiedTime(full)
      : statSync(full).mtimeMs
    newest = Math.max(newest, time)
  }
  return newest
}

/**
 * The files the manifest names that are not in .public. A build that was
 * interrupted, or two builds running at once, can leave a manifest pointing
 * at files that are gone, and every page then renders without its styles.
 */
export const missingBuiltFiles = (root) => {
  let manifest
  try {
    manifest = JSON.parse(readFileSync(path.join(root, BUILT_MARKER), 'utf8'))
  } catch {
    return [BUILT_MARKER]
  }
  return Object.values(manifest).filter(
    (file) => !existsSync(path.join(root, '.public', file))
  )
}

/**
 * Whether the styles and scripts need building: .public has no manifest, the
 * manifest names files that are missing, or something in src/client changed
 * after it was written.
 */
export const needsClientBuild = (root) => {
  const marker = path.join(root, BUILT_MARKER)
  if (!existsSync(marker) || missingBuiltFiles(root).length > 0) {
    return true
  }
  return (
    newestModifiedTime(path.join(root, 'src/client')) > statSync(marker).mtimeMs
  )
}

/** Runs `npm run build:frontend`, logging to `logFile`. */
export const buildClientAssets = (root, logFile) =>
  new Promise((resolve, reject) => {
    const logFd = openSync(logFile, 'a')
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const child = spawn(npm, ['run', 'build:frontend'], {
      cwd: root,
      stdio: ['ignore', logFd, logFd]
    })
    closeSync(logFd)
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `Building the prototype's styles and scripts failed. See ${logFile}.`
          )
        )
      }
    })
  })
