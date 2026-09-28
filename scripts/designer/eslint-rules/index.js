/**
 * The prototype's own ESLint rules, as a flat-config plugin: house
 * conventions no shared plugin checks. See each rule's own file for why it
 * exists.
 */
import { postHandlerValidates } from './post-handler-validates.js'
import { routeParamsValidated } from './route-params-validated.js'
import { serviceBarrelImports } from './service-barrel-imports.js'

export const designerRules = {
  meta: { name: 'designer-rules' },
  rules: {
    'route-params-validated': routeParamsValidated,
    'post-handler-validates': postHandlerValidates,
    'service-barrel-imports': serviceBarrelImports
  }
}
