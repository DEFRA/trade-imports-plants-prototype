/**
 * `npm run designer:walkthrough -- [options]`: every example in a set walked
 * through the prototype page by page, in a Playwright report with a picture
 * of each page, a video and a trace. See docs/designers/seeing-your-change.md.
 */
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { USAGE, parseWalkthroughArgs } from './options.js'
import { NO_BROWSER, WalkthroughProblem, runWalkthrough } from './run.js'

export const main = async (argv) => {
  const { options, problems } = parseWalkthroughArgs(argv)
  if (options.help) {
    console.log(USAGE)
    return 0
  }
  if (problems.length > 0) {
    console.error([...problems, '', USAGE].join('\n'))
    return 1
  }
  try {
    return await runWalkthrough(options, {
      say: (line) => console.log(line)
    })
  } catch (error) {
    if (error instanceof WalkthroughProblem) {
      console.error(error.message)
      return 1
    }
    if (/Executable doesn't exist/.test(String(error?.message))) {
      console.error(NO_BROWSER)
      return 1
    }
    console.error(`designer:walkthrough stopped: ${error?.stack ?? error}`)
    return 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2))
}
