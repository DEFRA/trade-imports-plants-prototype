import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  PROTOTYPE_CONFIG_PATH,
  readPrototypeConfig
} from './prototype-config.js'
import { REPO_ROOT } from './repo.js'

describe('readPrototypeConfig', () => {
  let root
  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true })
      root = null
    }
  })

  const withConfig = (content) => {
    root = mkdtempSync(path.join(tmpdir(), 'prototype-config-'))
    if (content !== null) {
      mkdirSync(path.dirname(path.join(root, PROTOTYPE_CONFIG_PATH)), {
        recursive: true
      })
      writeFileSync(path.join(root, PROTOTYPE_CONFIG_PATH), content)
    }
    return root
  }

  it("Should read this prototype's own facts", () => {
    const config = readPrototypeConfig({ root: REPO_ROOT })
    expect(config.repository).toBe('DEFRA/trade-imports-plants-prototype')
    expect(config.realService.cloneUrl).toBe(
      'https://github.com/DEFRA/trade-imports-plants-frontend.git'
    )
    expect(config.handOff.jiraProject).toBe('EUDPA')
    expect(config).toHaveProperty('deployedUrl')
  })

  it('Should answer every key, empty, when there is no file', () => {
    expect(readPrototypeConfig({ root: withConfig(null) })).toEqual({
      repository: null,
      cloneUrl: null,
      deployedUrl: null,
      realService: {},
      handOff: {},
      maintainer: null
    })
  })

  it('Should answer the empty shape rather than fail on a broken file', () => {
    expect(
      readPrototypeConfig({ root: withConfig('{ not json') }).deployedUrl
    ).toBeNull()
  })

  it('Should keep the keys a file gives and fill in the rest', () => {
    const config = readPrototypeConfig({
      root: withConfig('{ "deployedUrl": "https://prototype.example" }\n')
    })
    expect(config.deployedUrl).toBe('https://prototype.example')
    expect(config.handOff).toEqual({})
  })
})
