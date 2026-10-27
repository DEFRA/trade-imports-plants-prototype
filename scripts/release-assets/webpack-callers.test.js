import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { bareWebpackCallers } from './webpack-callers.js'

const repoRoot = path.join(import.meta.dirname, '../..')

describe('bareWebpackCallers', () => {
  it('Should find no caller in this repo that builds without the prototype config', () => {
    const { scripts } = JSON.parse(
      readFileSync(path.join(repoRoot, 'package.json'), 'utf8')
    )
    const dockerfile = readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8')

    expect(bareWebpackCallers({ scripts, dockerfile })).toEqual([])
  })

  it('Should name each script and Dockerfile line that runs webpack without the prototype config', () => {
    const callers = bareWebpackCallers({
      scripts: {
        'build:frontend':
          'NODE_ENV=production webpack --config webpack.prototype.config.js',
        'build:stats': 'webpack --profile --json',
        'frontend:watch': 'NODE_ENV=development webpack --watch',
        'lint:js': 'eslint . --ignore-pattern webpack.config.js'
      },
      dockerfile: 'COPY . .\nRUN npx webpack\nRUN npm run build:frontend'
    })

    expect(callers).toEqual([
      'package.json script "build:stats": webpack --profile --json',
      'package.json script "frontend:watch": NODE_ENV=development webpack --watch',
      'Dockerfile line 2: RUN npx webpack'
    ])
  })
})
