import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformContent, transformPath } from './transform.js'

/**
 * Copies a template set's directory tree to the new set's, transforming
 * every file's content and every entry's name on the way — the filesystem
 * shell around `transform.js`'s pure rewrite.
 */
export const copySetTree = (sourceDir, destDir, { fromId, newId }) => {
  mkdirSync(destDir, { recursive: true })
  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = join(sourceDir, entry.name)
    const destPath = join(destDir, transformPath(entry.name, { fromId, newId }))
    if (entry.isDirectory()) {
      copySetTree(sourcePath, destPath, { fromId, newId })
    } else {
      const content = readFileSync(sourcePath, 'utf8')
      writeFileSync(destPath, transformContent(content, { fromId, newId }))
    }
  }
}

/**
 * Copies the template's routes file — `routes-<fromId>.js`, a sibling of
 * `sets/`, not inside it — the same way.
 */
export const copyRoutesFile = (sourcePath, destPath, { fromId, newId }) => {
  const content = readFileSync(sourcePath, 'utf8')
  writeFileSync(destPath, transformContent(content, { fromId, newId }))
}
