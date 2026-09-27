import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDescription, removeDescription } from './describe-set.js'

const BEFORE = `const DESCRIPTIONS = {
  'high-risk-plants':
    'The real high-risk plants and plant products notification journey.',
  'sample-journey':
    'A placeholder set, kept to prove the host can serve more than one prototype.'
}

export const descriptionFor = (setId) => DESCRIPTIONS[setId]
`

let file

const read = () => readFileSync(file, 'utf8')

beforeEach(() => {
  const dir = mkdtempSync(path.join(tmpdir(), 'describe-set-'))
  file = path.join(dir, 'descriptions.js')
  writeFileSync(file, BEFORE)
})

afterEach(() => {
  rmSync(path.dirname(file), { recursive: true, force: true })
})

describe('addDescription', () => {
  it('Should add an entry the chooser can read', async () => {
    addDescription(file, { setId: 'plants-dr2', text: 'Design release 2' })

    const { descriptionFor } = await import(`${file}?add`)
    expect(descriptionFor('plants-dr2')).toBe('Design release 2')
    expect(descriptionFor('sample-journey')).toEqual(expect.any(String))
  })

  it('Should keep quotes and backslashes in the text', async () => {
    addDescription(file, {
      setId: 'plants-dr2',
      text: String.raw`The designer's copy \ with a backslash`
    })

    const { descriptionFor } = await import(`${file}?quotes`)
    expect(descriptionFor('plants-dr2')).toBe(
      String.raw`The designer's copy \ with a backslash`
    )
  })

  it('Should replace an existing entry rather than add a second', async () => {
    addDescription(file, { setId: 'plants-dr2', text: 'First' })
    addDescription(file, { setId: 'plants-dr2', text: 'Second' })

    expect(read().match(/'plants-dr2'/g)).toHaveLength(1)
    const { descriptionFor } = await import(`${file}?replace`)
    expect(descriptionFor('plants-dr2')).toBe('Second')
  })
})

describe('removeDescription', () => {
  it('Should take out exactly what addDescription put in', () => {
    addDescription(file, { setId: 'plants-dr2', text: 'Design release 2' })

    expect(removeDescription(file, { setId: 'plants-dr2' })).toBe(true)
    expect(read()).toBe(BEFORE)
  })

  it('Should take out an entry that prettier put on one line', () => {
    writeFileSync(
      file,
      BEFORE.replace(
        "prototype.'\n}",
        "prototype.',\n  'plants-dr2': 'Design release 2'\n}"
      )
    )

    expect(removeDescription(file, { setId: 'plants-dr2' })).toBe(true)
    expect(read()).toBe(BEFORE)
  })

  it('Should take out an entry in the middle of the list', () => {
    writeFileSync(
      file,
      BEFORE.replace(
        "  'sample-journey':",
        "  'plants-dr2': 'Design release 2',\n  'sample-journey':"
      )
    )

    expect(removeDescription(file, { setId: 'plants-dr2' })).toBe(true)
    expect(read()).toBe(BEFORE)
  })

  it('Should answer false when the set has no description', () => {
    expect(removeDescription(file, { setId: 'plants-dr9' })).toBe(false)
    expect(read()).toBe(BEFORE)
  })
})
