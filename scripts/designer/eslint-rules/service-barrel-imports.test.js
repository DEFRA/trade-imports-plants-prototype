import { RuleTester } from 'eslint'

import { serviceBarrelImports } from './service-barrel-imports.js'

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: 'module' }
})

ruleTester.run('service-barrel-imports', serviceBarrelImports, {
  valid: [
    { code: "import * as stub from './stub.js'" },
    {
      code: "import { isStubDataMode } from '../../../common/services/mode.js'"
    },
    {
      code: "import { BackendRequestError } from '../persistence/records/errors.js'"
    }
  ],
  invalid: [
    {
      code: "import { createFakeStore } from '../../../prototype-support/fake-store.js'",
      errors: [{ messageId: 'prototypeImport' }]
    },
    {
      code: "import { idFromName } from '../../../prototype-support/search-page.js'",
      errors: [{ messageId: 'prototypeImport' }]
    }
  ]
})
