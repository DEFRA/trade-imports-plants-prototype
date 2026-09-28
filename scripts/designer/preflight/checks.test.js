import { describe, expect, it } from 'vitest'

import {
  checkBrowser,
  checkGitHubCli,
  checkGitIdentity,
  checkNode,
  checkPackages,
  checkPort,
  checkPush,
  checkUpstreamRemote,
  exitCodeFor,
  formatResults,
  installCommandFor,
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

describe('installCommandFor', () => {
  it.each([
    ['npm@11.6.2', 'npx --yes npm@11.6.2 ci'],
    ['npm@12.0.1', 'npx --yes npm@12.0.1 ci'],
    ['npm@11.6.2+sha512.abc123', 'npx --yes npm@11.6.2 ci'],
    ['pnpm@9.0.0', 'npm ci'],
    [undefined, 'npm ci']
  ])('Should turn packageManager %s into %s', (packageManager, command) => {
    expect(installCommandFor(packageManager)).toBe(command)
  })
})

describe('checkPackages', () => {
  const installCommand = 'npx --yes npm@11.6.2 ci'

  it('Should ask for an install when nothing is installed', () => {
    expect(checkPackages({ installed: false, installCommand })).toEqual({
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
        drift: ['node_modules/joi', 'node_modules/fresh'],
        installCommand
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

describe('checkGitIdentity', () => {
  it('Should be happy when git has a name and email', () => {
    expect(
      checkGitIdentity({ name: 'Ada Designer', email: 'ada@example.com' })
    ).toEqual({
      id: 'git',
      status: 'ok',
      message: 'Git saves your work as Ada Designer <ada@example.com>.'
    })
  })

  it('Should give the command for each part that is missing', () => {
    const result = checkGitIdentity({ name: null, email: 'ada@example.com' })
    expect(result.status).toBe('todo')
    expect(result.message).toContain(
      'git config --global user.name "Your Name"'
    )
    expect(result.message).not.toContain('user.email')
  })
})

describe('checkUpstreamRemote', () => {
  const cloneUrl = 'https://github.com/DEFRA/trade-imports-plants-frontend.git'

  it('Should give both commands when a fresh clone has no upstream remote', () => {
    expect(
      checkUpstreamRemote({ fetchUrl: null, pushUrl: null, cloneUrl })
    ).toEqual({
      id: 'upstream',
      status: 'todo',
      commands: [
        `git remote add upstream ${cloneUrl}`,
        'git remote set-url --push upstream DISABLED'
      ],
      message: `This copy cannot compare a hand-off with the real service (plants-frontend) yet. Run: git remote add upstream ${cloneUrl} then git remote set-url --push upstream DISABLED (the second stops anything ever being sent there).`
    })
  })

  it('Should ask to lock the send address when it is not DISABLED', () => {
    const result = checkUpstreamRemote({
      fetchUrl: cloneUrl,
      pushUrl: cloneUrl,
      cloneUrl
    })
    expect(result.status).toBe('todo')
    expect(result.commands).toEqual([
      'git remote set-url --push upstream DISABLED'
    ])
  })

  it('Should be happy when it can fetch and cannot send', () => {
    expect(
      checkUpstreamRemote({ fetchUrl: cloneUrl, pushUrl: 'DISABLED', cloneUrl })
        .status
    ).toBe('ok')
  })
})

describe('checkGitHubCli', () => {
  it('Should say pull requests still work without gh', () => {
    const result = checkGitHubCli({ installed: false })
    expect(result.status).toBe('todo')
    expect(result.message).toContain('a link to open one in your browser')
    expect(result.message).toContain('gh auth login')
  })

  it('Should ask to sign in when --share found gh signed out', () => {
    expect(checkGitHubCli({ installed: true, signedIn: false })).toEqual({
      id: 'gh',
      status: 'todo',
      message:
        'The GitHub command line (gh) is installed but not signed in. Run: gh auth login'
    })
  })

  it('Should be happy with gh installed, and say how to check the sign-in', () => {
    const result = checkGitHubCli({ installed: true, signedIn: null })
    expect(result.status).toBe('ok')
    expect(result.message).toContain('designer:preflight -- --share')
  })
})

describe('checkPush', () => {
  const repository = 'DEFRA/trade-imports-plants-prototype'

  it('Should be happy when a dry-run send works', () => {
    expect(checkPush({ canPush: true, detail: null, repository })).toEqual({
      id: 'push',
      status: 'ok',
      message:
        'You can send branches to DEFRA/trade-imports-plants-prototype on GitHub.'
    })
  })

  it('Should say what git said and who to ask for access', () => {
    const result = checkPush({
      canPush: false,
      detail:
        'remote: Permission to DEFRA/trade-imports-plants-prototype.git denied.',
      repository
    })
    expect(result.status).toBe('todo')
    expect(result.message).toContain('(git said: remote: Permission')
    expect(result.message).toContain(
      'Ask the prototype maintainer for write access'
    )
  })
})

describe('formatResults and exitCodeFor', () => {
  const results = [
    { id: 'node', status: 'ok', message: 'Node 24.11.1.' },
    { id: 'port', status: 'busy', message: 'In use.' },
    { id: 'gh', status: 'todo', message: 'Not installed.' }
  ]

  it('Should print one plain line per check', () => {
    expect(formatResults(results)).toEqual([
      'OK - Node: Node 24.11.1.',
      'In use - Port 3103: In use.',
      'Before you share - GitHub command line: Not installed.'
    ])
  })

  it('Should fail only when something needs doing before the prototype runs', () => {
    expect(exitCodeFor(results)).toBe(0)
    expect(exitCodeFor([...results, { id: 'packages', status: 'fix' }])).toBe(1)
  })
})
