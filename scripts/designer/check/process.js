/**
 * Runs one command with an argument array (never a shell string) and
 * collects everything it prints, stdout and stderr together, in the order it
 * arrived. The check reads that output to explain failures.
 */
import { spawn } from 'node:child_process'
import process from 'node:process'

/**
 * @param {string} command - for example `npm` or `process.execPath`.
 * @param {string[]} args - its arguments.
 * @param {{cwd: string, env?: object}} options - where to run it, and any
 * environment variables to add.
 * @returns {Promise<{code: number, output: string}>}
 */
export const runCommand = (command, args, { cwd, env = {} }) =>
  new Promise((resolve) => {
    const chunks = []
    const collected = () => Buffer.concat(chunks).toString('utf8')
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      // npm is npm.cmd on Windows, which only runs through a shell.
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    child.stdout.on('data', (chunk) => chunks.push(chunk))
    child.stderr.on('data', (chunk) => chunks.push(chunk))
    child.on('error', (error) => {
      chunks.push(Buffer.from(`${error.message}\n`))
      resolve({ code: 1, output: collected() })
    })
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output: collected() })
    })
  })
