import { describe, expect, it } from 'vitest'

import {
  checkBrowser,
  checkNode,
  checkPackages,
  checkPort,
  exitCodeFor,
  formatResults,
  packagesDrift,
  parseLsof
} from './checks.js'

describe('checkNode', () => {
  it('Should be happy with the exact version', () => {
    expect(checkNode('24.11.1', 'v24.11.1\n')).toEqual({
      id: 'node',
      status: 'ok',
      message: 'Node 24.11.1, the version this prototype expects.'
    })
  })

  it('Should accept the same major version', () => {
    expect(checkNode('24.3.0', 'v24.11.1').status).toBe('ok')
  })

  it('Should ask for the right Node when the major version differs', () => {
    expect(checkNode('22.9.0', 'v24.11.1')).toEqual({
      id: 'node',
      status: 'fix',
      message:
        'This prototype needs Node 24.11.1, and this computer has Node 22.9.0. If you use nvm, run: nvm install (then open a new terminal).'
    })
  })
})

describe('packagesDrift', () => {
  const lock = {
    packages: {
      '': { name: 'trade-imports-plants-prototype' },
      'node_modules/nunjucks': { version: '3.2.4' },
      'node_modules/joi': { version: '17.13.7' },
      'node_modules/@esbuild/win32-x64': { version: '0.28.1', optional: true },
      'node_modules/fresh': { version: '1.0.0' }
    }
  }

  it('Should list packages missing or at a different version, skipping optional ones', () => {
    const installed = {
      packages: {
        'node_modules/nunjucks': { version: '3.2.4' },
        'node_modules/joi': { version: '17.13.6' }
      }
    }
    expect(packagesDrift(lock, installed)).toEqual([
      'node_modules/joi',
      'node_modules/fresh'
    ])
  })

  it('Should find nothing when the install matches', () => {
    expect(packagesDrift(lock, lock)).toEqual([])
  })
})

describe('checkPackages', () => {
  it('Should ask for an install when nothing is installed', () => {
    expect(checkPackages({ installed: false })).toEqual({
      id: 'packages',
      status: 'fix',
      message:
        "The prototype's packages are not installed. Run: npx --yes npm@11.6.2 ci"
    })
  })

  it('Should ask for an install when installed packages do not match', () => {
    expect(
      checkPackages({
        installed: true,
        drift: ['node_modules/joi', 'node_modules/fresh']
      })
    ).toEqual({
      id: 'packages',
      status: 'fix',
      message:
        '2 installed package(s) do not match the package list (for example joi, fresh). Run: npx --yes npm@11.6.2 ci'
    })
  })

  it('Should be happy when the install matches', () => {
    expect(checkPackages({ installed: true, drift: [] }).status).toBe('ok')
  })
})

describe('checkBrowser', () => {
  it('Should wait for the packages before checking the browser', () => {
    expect(checkBrowser({ packagesInstalled: false }).status).toBe('fix')
  })

  it('Should ask for the browser install when Chromium is missing', () => {
    expect(
      checkBrowser({
        packagesInstalled: true,
        browserPath: '/cache/chromium',
        browserFound: false
      }).message
    ).toBe(
      'The browser designer:show uses is not installed (looked for /cache/chromium). Run: npm run playwright:install'
    )
  })

  it('Should be happy when Chromium is there', () => {
    expect(
      checkBrowser({
        packagesInstalled: true,
        browserPath: '/x',
        browserFound: true
      }).status
    ).toBe('ok')
  })
})

describe('parseLsof', () => {
  it('Should read the process id and command', () => {
    expect(parseLsof('p4242\ncnode\nf23\n')).toEqual({
      pid: 4242,
      command: 'node'
    })
  })

  it('Should answer null when nothing is listening', () => {
    expect(parseLsof('')).toBeNull()
  })
})

describe('checkPort', () => {
  it('Should say the port is free', () => {
    expect(checkPort({ free: true })).toEqual({
      id: 'port',
      status: 'ok',
      message: 'Port 3103 is free, ready for npm run dev.'
    })
  })

  it('Should name who holds the port, say it is probably the prototype, and stop nothing', () => {
    expect(
      checkPort({
        free: false,
        holder: { pid: 4242, command: 'node' },
        answersLikeThePrototype: true
      })
    ).toEqual({
      id: 'port',
      status: 'busy',
      holder: { pid: 4242, command: 'node' },
      message:
        'Port 3103 is in use by node (process 4242). It answers like the prototype, so the prototype is probably already running at http://localhost:3103. Nothing has been stopped.'
    })
  })

  it('Should cope with not knowing who holds the port', () => {
    expect(
      checkPort({ free: false, holder: null, answersLikeThePrototype: false })
        .message
    ).toBe(
      'Port 3103 is in use by another program. It may be the prototype started in another terminal, or a different program. Nothing has been stopped.'
    )
  })
})

describe('formatResults and exitCodeFor', () => {
  const results = [
    { id: 'node', status: 'ok', message: 'Node 24.11.1.' },
    { id: 'port', status: 'busy', message: 'In use.' }
  ]

  it('Should print one plain line per check', () => {
    expect(formatResults(results)).toEqual([
      'OK - Node: Node 24.11.1.',
      'In use - Port 3103: In use.'
    ])
  })

  it('Should fail only when something needs doing', () => {
    expect(exitCodeFor(results)).toBe(0)
    expect(exitCodeFor([...results, { id: 'packages', status: 'fix' }])).toBe(1)
  })
})
