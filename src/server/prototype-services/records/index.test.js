import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('records wrapper entry point', () => {
  it('Should declare designerRecords where npm run new:set looks for it', () => {
    const source = readFileSync(new URL('./index.js', import.meta.url), 'utf8')

    // The same test scripts/new-set/designer-records.js makes before it wires
    // a new release's gateway to the wrapper.
    expect(source).toMatch(
      /export\s+(?:const|function|async function)\s+designerRecords\b/
    )
  })
})
