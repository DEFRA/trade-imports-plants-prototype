import { describe, expect, it } from 'vitest'
import { copyChanges, copyLeaves, isCopyFile } from './copy-table.js'

const BEFORE = `// a comment
export const copy = {
  title: 'Arrival details',
  time: {
    label: 'Expected time of arrival',
    hint: 'Use the 24-hour clock. For example, 14:30.'
  },
  heading: (name) => \`Details for \${name}\`
}
`

describe('copyLeaves', () => {
  it('Should read every string in a copy module by its key path', () => {
    expect(copyLeaves(BEFORE)).toEqual({
      title: 'Arrival details',
      'time.label': 'Expected time of arrival',
      'time.hint': 'Use the 24-hour clock. For example, 14:30.',
      heading: '(name) => `Details for $' + '{name}`'
    })
  })

  it('Should give null for a file it cannot read as data', () => {
    expect(
      copyLeaves("import x from './y.js'\nexport const copy = x")
    ).toBeNull()
  })

  it('Should give no leaves for a file that does not exist', () => {
    expect(copyLeaves(null)).toEqual({})
  })
})

describe('copyChanges', () => {
  it('Should list only the strings that changed, old and new', () => {
    const after = BEFORE.replace(
      'Use the 24-hour clock. For example, 14:30.',
      'Use the 24-hour clock, for example 14:30.'
    )

    expect(copyChanges(BEFORE, after)).toEqual([
      {
        key: 'time.hint',
        before: 'Use the 24-hour clock. For example, 14:30.',
        after: 'Use the 24-hour clock, for example 14:30.'
      }
    ])
  })

  it('Should show an added key with no old text', () => {
    const after = BEFORE.replace(
      "title: 'Arrival details',",
      "title: 'Arrival details',\n  caption: 'Arrival',"
    )

    expect(copyChanges(BEFORE, after)).toEqual([
      { key: 'caption', before: null, after: 'Arrival' }
    ])
  })

  it('Should treat a new file as every key added', () => {
    expect(copyChanges(null, "export const copy = { title: 'New' }")).toEqual([
      { key: 'title', before: null, after: 'New' }
    ])
  })
})

describe('isCopyFile', () => {
  it.each([
    ['features/origin/copy/copy.en.js', true],
    ['features/origin/copy/copy.cy.js', true],
    ['features/origin/copy/copy.test.js', false],
    ['features/origin/controller.js', false]
  ])('Should say %s is a copy module: %s', (filePath, expected) => {
    expect(isCopyFile(filePath)).toBe(expected)
  })
})
