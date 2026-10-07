import { describe, expect, test } from 'vitest'

import { npmCiCommandFor } from './checks.js'

describe('npmCiCommandFor', () => {
  test('runs the npm that packageManager pins', () => {
    expect(npmCiCommandFor('npm@12.3.4')).toEqual({
      command: 'npx',
      args: ['--yes', 'npm@12.3.4', 'ci']
    })
  })

  test('drops a Corepack integrity suffix, which npm rejects', () => {
    expect(npmCiCommandFor('npm@12.3.4+sha512.abc123')).toEqual({
      command: 'npx',
      args: ['--yes', 'npm@12.3.4', 'ci']
    })
  })

  test.each([undefined, '', 'pnpm@9.0.0', 'npm@latest'])(
    'falls back to plain npm ci when packageManager is %s',
    (packageManager) => {
      expect(npmCiCommandFor(packageManager)).toEqual({
        command: 'npm',
        args: ['ci']
      })
    }
  )
})
