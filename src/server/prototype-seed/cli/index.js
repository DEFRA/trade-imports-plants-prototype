/**
 * Entry point for `npm run designer:examples -- <command> <set-id>`.
 *
 * The prototype's own defaults (stub data, in-memory sessions) apply first, as
 * they do for `npm run dev`, and the server's logs are quiet unless LOG_LEVEL
 * says otherwise, so a designer reads only the report. The commands are loaded
 * after that, because the server's config reads the environment when it is
 * first imported.
 */
import process from 'node:process'

import '../../../prototype-defaults.js'

process.env.LOG_LEVEL ??= 'silent'

const { main } = await import('./commands.js')

const [, , ...argv] = process.argv

// Exit explicitly: the in-process server `check` starts may leave timers
// behind after it stops, and the report is complete by now.
process.exit(await main(argv))
