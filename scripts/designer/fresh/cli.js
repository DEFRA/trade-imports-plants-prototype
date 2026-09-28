/**
 * `npm run designer:fresh`: runs the prototype like `npm run dev`, but a
 * design release keeps nothing across a restart (PROTOTYPE_PERSIST=false).
 * Use it for a research session or a demo that must start from the examples
 * every time. It sets the variable itself, so nobody has to type
 * `PROTOTYPE_PERSIST=false npm run dev`, a form Windows terminals do not
 * understand. (`npm run dev` itself is the real service's script and sets a
 * variable the same way, so on Windows the prototype still needs Git Bash or
 * WSL.)
 */
import { spawn } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { REPO_ROOT } from '../lib/repo.js'

/** The environment for a fresh run: everything else is left as it is. */
export const freshEnv = (env) => ({ ...env, PROTOTYPE_PERSIST: 'false' })

/** How to start `npm run dev` on this kind of computer. */
export const devCommand = (platform) =>
  platform === 'win32'
    ? { command: 'npm.cmd', args: ['run', 'dev'], shell: true }
    : { command: 'npm', args: ['run', 'dev'], shell: false }

export const main = () => {
  const { command, args, shell } = devCommand(process.platform)
  console.log(
    'Starting the prototype without keeping your design releases’ data. Every restart starts from the examples.'
  )
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    env: freshEnv(process.env),
    stdio: 'inherit',
    shell
  })
  child.on('exit', (code) => {
    process.exitCode = code ?? 1
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
