import { describe, expect, it } from 'vitest'

import { devCommand, freshEnv } from './cli.js'

describe('freshEnv', () => {
  it('Should switch saving off and keep everything else', () => {
    expect(freshEnv({ PATH: '/bin', PROTOTYPE_PERSIST: 'true' })).toEqual({
      PATH: '/bin',
      PROTOTYPE_PERSIST: 'false'
    })
  })
})

describe('devCommand', () => {
  it('Should run npm run dev directly on a Mac or Linux', () => {
    expect(devCommand('darwin')).toEqual({
      command: 'npm',
      args: ['run', 'dev'],
      shell: false
    })
  })

  it('Should run npm.cmd through the shell on Windows', () => {
    expect(devCommand('win32')).toEqual({
      command: 'npm.cmd',
      args: ['run', 'dev'],
      shell: true
    })
  })
})
