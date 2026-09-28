import neostandard from 'neostandard'
import sonarjs from 'eslint-plugin-sonarjs'

import { designerRules } from './scripts/designer/eslint-rules/index.js'

export default [
  ...neostandard({
    env: ['node', 'vitest'],
    ignores: [...neostandard.resolveIgnoresFromGitignore()],
    noJsx: true,
    noStyle: true
  }),
  {
    // page.evaluate callbacks in Playwright specs run in the browser
    files: ['**/*.fit.spec.js'],
    languageOptions: {
      globals: {
        DataTransfer: 'readonly',
        Option: 'readonly',
        getComputedStyle: 'readonly'
      }
    }
  },
  {
    // Workflow tool scripts are async function bodies whose top-level return
    // is the result, which no module parser accepts; their tests lint instead
    ignores: ['.claude/workflows/*.js', '!.claude/workflows/*.test.js']
  },
  {
    // mirrors the SonarCloud quality-gate rules that have local equivalents
    files: ['src/server/**/*.js'],
    plugins: { sonarjs },
    rules: {
      curly: ['error', 'all'],
      'default-param-last': 'error',
      'max-params': ['error', 7],
      'no-shadow': 'error',
      'prefer-object-has-own': 'error',
      'sonarjs/cognitive-complexity': 'error',
      'sonarjs/concise-regex': 'error',
      'sonarjs/cyclomatic-complexity': 'error',
      'sonarjs/elseif-without-else': 'error',
      'sonarjs/function-return-type': 'error',
      'sonarjs/max-lines-per-function': 'error',
      'sonarjs/no-duplicate-string': 'error',
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-nested-template-literals': 'error',
      'sonarjs/no-undefined-assignment': 'error',
      'sonarjs/no-unused-function-argument': 'error',
      'sonarjs/prefer-regexp-exec': 'error',
      'sonarjs/prefer-specific-assertions': 'error',
      'sonarjs/single-character-alternation': 'error',
      'sonarjs/super-linear-regex': 'error',
      'sonarjs/too-many-break-or-continue-in-loop': 'error'
    }
  },
  {
    files: ['src/server/**/*.js'],
    ignores: ['**/*.test.js', '**/*.spec.js', '**/*.cy.js'],
    rules: {
      'no-magic-numbers': [
        'error',
        {
          ignore: [-1, 0, 1],
          ignoreDefaultValues: true,
          ignoreArrayIndexes: true
        }
      ]
    }
  },
  {
    // House conventions no shared plugin checks. See
    // scripts/designer/eslint-rules/ for why each one exists. Scoped to
    // src/server/app/sets/: routes elsewhere (the chooser, examples) are the
    // real service's own and out of a designer's reach.
    files: ['src/server/app/sets/**/*.js'],
    ignores: ['**/*.test.js', '**/*.spec.js', '**/*.cy.js'],
    plugins: { 'designer-rules': designerRules },
    rules: {
      'designer-rules/route-params-validated': 'error'
    }
  },
  {
    // Only design releases and the platform sample: high-risk-plants is the
    // real journey, proven by its own suite already. Only pages that
    // collect fields (add, edit): a delete or cancel confirmation posts
    // nothing to validate.
    files: [
      'src/server/app/sets/**/add/*.js',
      'src/server/app/sets/**/edit/*.js',
      'src/server/app/sets/**/features/*/controller.js'
    ],
    ignores: [
      'src/server/app/sets/high-risk-plants/**',
      '**/*.test.js',
      '**/*.spec.js'
    ],
    plugins: { 'designer-rules': designerRules },
    rules: {
      'designer-rules/post-handler-validates': 'error'
    }
  },
  {
    // The files a hand-off's patch proposes for plants-frontend: they must
    // not import the prototype's own plumbing.
    files: [
      'src/server/app/services/*/index.js',
      'src/server/app/services/*/client.js'
    ],
    plugins: { 'designer-rules': designerRules },
    rules: {
      'designer-rules/service-barrel-imports': 'error'
    }
  }
]
