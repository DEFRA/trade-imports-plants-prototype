/**
 * designer:show's own prototype server. It never uses the designer's port
 * (3103): it picks a free port from 3203 up, runs with stub data and no
 * example data (so every page starts from what the run itself fills in),
 * never saves data to disk (so a designer's saved release data is left
 * alone), and is stopped when the run ends. A running `npm run dev` is never
 * touched.
 */
import { spawn } from 'node:child_process'
import { openSync, closeSync, readFileSync } from 'node:fs'
import net from 'node:net'
import process from 'node:process'

export const FIRST_SHOW_PORT = 3203
export const DESIGNER_PORT = 3103
const LAST_PORT_TRIED = 3299
const HEALTH_TIMEOUT_MS = 120_000
const HEALTH_POLL_MS = 250
const STOP_GRACE_MS = 5_000
const LOG_TAIL_LINES = 30

const CONNECT_TIMEOUT_MS = 500

/** Whether something answers a connection on `host`:`port`. */
const answers = (port, host) =>
  new Promise((resolve) => {
    const socket = net.connect({ port, host })
    const finish = (result) => {
      socket.destroy()
      resolve(result)
    }
    socket.setTimeout(CONNECT_TIMEOUT_MS, () => finish(false))
    socket.once('connect', () => finish(true))
    socket.once('error', () => finish(false))
  })

const canListen = (port, host) =>
  new Promise((resolve) => {
    const probe = net.createServer()
    probe.once('error', () => resolve(false))
    probe.once('listening', () => probe.close(() => resolve(true)))
    probe.listen(port, host)
  })

/**
 * Whether nothing is using `port`. Trying to listen is not enough on its
 * own: on a Mac an IPv6 listener can sit beside a server already listening
 * on IPv4, so the port first gets a knock on the door.
 */
export const isPortFree = async (port) => {
  if ((await answers(port, '127.0.0.1')) || (await answers(port, '::1'))) {
    return false
  }
  return canListen(port, '0.0.0.0')
}

/**
 * The first free port from `from` up, skipping the designer's own port and
 * any in `avoid`.
 */
export const findFreePort = async (from = FIRST_SHOW_PORT, avoid = []) => {
  for (let port = from; port <= LAST_PORT_TRIED; port += 1) {
    if (
      port !== DESIGNER_PORT &&
      !avoid.includes(port) &&
      (await isPortFree(port))
    ) {
      return port
    }
  }
  throw new Error(
    `No free port between ${from} and ${LAST_PORT_TRIED}. Close some other programs and try again.`
  )
}

/** The environment the show server runs with. */
export const showServerEnv = (port, baseEnv = process.env) => ({
  ...baseEnv,
  NODE_ENV: 'development',
  STUB_MODE: 'true',
  PROTOTYPE_SEED: 'false',
  PROTOTYPE_PERSIST: 'false',
  PORT: String(port),
  HOST: '127.0.0.1',
  NUNJUCKS_WATCH: 'false',
  AWS_EMF_ENVIRONMENT: 'Local'
})

const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

const tailOf = (logFile) => {
  try {
    return readFileSync(logFile, 'utf8')
      .split('\n')
      .slice(-LOG_TAIL_LINES)
      .join('\n')
  } catch {
    return ''
  }
}

const isHealthy = async (url) => {
  try {
    const response = await fetch(url)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Starts the prototype from `cwd` on `port`, writing its log to `logFile`,
 * and waits until /health answers.
 *
 * @returns {Promise<{ url: string, stop: () => Promise<void> }>}
 */
export const startShowServer = async ({ cwd, port, logFile }) => {
  const logFd = openSync(logFile, 'a')
  const child = spawn(process.execPath, ['.'], {
    cwd,
    env: showServerEnv(port),
    stdio: ['ignore', logFd, logFd]
  })
  closeSync(logFd)
  let exited = null
  const exit = new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      exited = { code, signal }
      resolve('exited')
    })
  })

  const url = `http://127.0.0.1:${port}`
  const stop = async () => {
    if (exited) {
      return
    }
    child.kill('SIGTERM')
    const graceOver = new Promise((resolve) => {
      setTimeout(() => resolve('grace over'), STOP_GRACE_MS).unref()
    })
    if ((await Promise.race([exit, graceOver])) !== 'exited') {
      child.kill('SIGKILL')
      await exit
    }
  }

  const started = Date.now()
  while (Date.now() - started < HEALTH_TIMEOUT_MS) {
    if (exited) {
      throw new Error(
        `The prototype stopped before it was ready (exit ${exited.code ?? exited.signal}). The end of its log (${logFile}):\n${tailOf(logFile)}`
      )
    }
    if (await isHealthy(`${url}/health`)) {
      return { url, stop }
    }
    await delay(HEALTH_POLL_MS)
  }
  await stop()
  throw new Error(
    `The prototype did not start within ${HEALTH_TIMEOUT_MS / 1000} seconds. The end of its log (${logFile}):\n${tailOf(logFile)}`
  )
}
