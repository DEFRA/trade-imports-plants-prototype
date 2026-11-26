import { pagePath } from '../../../../../../../../shared/paths.js'
import { withTrail } from '../../../../../../../../shared/kit.js'
import {
  pageOfObligation,
  slugOfPage
} from '../../../../../../../../flow/dispatch.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const changeHref = ({ journeyId, changeLinkTrail }, obligationId) =>
  withTrail(
    pagePath(journeyId, slugOfPage(pageOfObligation(obligationId))),
    changeLinkTrail
  )

export const changeAction = (
  { journeyId, changeLinkTrail },
  obligationId,
  visuallyHiddenText
) => ({
  items: [
    {
      href: changeHref({ journeyId, changeLinkTrail }, obligationId),
      text: copy.change,
      visuallyHiddenText
    }
  ]
})

export const editableActions = ({ readOnly, actions }) =>
  readOnly ? {} : { actions }
