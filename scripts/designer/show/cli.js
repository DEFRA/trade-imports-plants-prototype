/**
 * `npm run designer:show -- --set <set-id> [options]`: pictures of a set's
 * pages, in a gallery you can open, share or attach to a pull request.
 * See docs/designers/seeing-your-change.md.
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/index.js'
import { axeSentence } from './manifest.js'
import { USAGE, parseShowArgs } from './options.js'
import { ShowProblem, countPictures, runShow } from './run.js'

const openInBrowser = (file) => {
  const [command, args] =
    process.platform === 'darwin'
      ? ['open', [file]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', file]]
        : ['xdg-open', [file]]
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => {})
  child.unref()
}

const seriousPages = (manifest) =>
  manifest.pages.filter((page) =>
    Object.values(page.axe).some((summary) =>
      (summary ?? []).some((item) =>
        ['critical', 'serious'].includes(item.impact)
      )
    )
  )

/** What the designer reads at the end of a run. */
export const summaryLines = (manifest, folder, root = REPO_ROOT) => {
  const gallery = path.relative(root, path.join(folder, 'index.html'))
  const lines = [
    '',
    `Gallery: ${gallery}`,
    `Newest gallery for this set, always: ${path.relative(root, path.join(path.dirname(folder), 'latest', 'index.html'))}`,
    `${countPictures(manifest)} picture(s) of ${manifest.pages.length} page(s) in ${manifest.set}.`
  ]
  if (manifest.video) {
    lines.push(
      `Walkthrough video: ${path.relative(root, path.join(folder, manifest.video))}`
    )
  }
  const serious = seriousPages(manifest)
  lines.push(
    serious.length > 0
      ? `Accessibility: serious problems on ${serious.map((page) => page.key).join(', ')}. The gallery explains each one.`
      : `Accessibility: ${axeSentence([])}`
  )
  if (manifest.neverReached.length > 0) {
    lines.push(`Pages no example reaches: ${manifest.neverReached.join(', ')}.`)
  }
  for (const note of manifest.notes) {
    lines.push(`Note: ${note}`)
  }
  return lines
}

export const main = async (argv) => {
  const { options, problems } = parseShowArgs(argv)
  if (options.help) {
    console.log(USAGE)
    return 0
  }
  if (problems.length > 0) {
    console.error([...problems, '', USAGE].join('\n'))
    return 1
  }
  try {
    const result = await runShow(options, { say: (line) => console.log(line) })
    if (result.message) {
      console.log(result.message)
      return 0
    }
    console.log(summaryLines(result.manifest, result.folder).join('\n'))
    if (options.open) {
      openInBrowser(path.join(result.folder, 'index.html'))
    }
    return 0
  } catch (error) {
    if (error instanceof ShowProblem) {
      console.error(error.message)
      return 1
    }
    if (/Executable doesn't exist/.test(String(error?.message))) {
      console.error(
        'The browser designer:show uses is not installed. Run: npm run playwright:install'
      )
      return 1
    }
    console.error(`designer:show stopped: ${error?.stack ?? error}`)
    return 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
