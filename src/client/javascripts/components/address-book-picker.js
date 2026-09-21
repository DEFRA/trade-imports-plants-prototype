const RADIO_SELECTOR = 'input[type="radio"]'
const PAGINATION_LINK_SELECTOR = '.govuk-pagination a[href]'

const hrefWithSelection = (href, selectedId, baseUrl) => {
  const next = new URL(href, baseUrl)
  next.searchParams.set('selected', selectedId)
  return `${next.pathname}${next.search}${next.hash}`
}

/**
 * Carries a newly ticked address through the picker's GET pagination links.
 *
 * The server renders links with the selection it knows about. A radio tick is
 * local browser state until the form is submitted, so progressively enhance
 * those links when that state changes. Search and save are form submissions
 * and already carry the checked radio without help.
 */
class AddressBookPicker {
  static moduleName = 'app-address-book-picker'

  constructor($module) {
    if (!$module) {
      return
    }

    $module.addEventListener('change', ({ target }) => {
      if (!target?.matches?.(RADIO_SELECTOR)) {
        return
      }

      for (const link of $module.querySelectorAll(PAGINATION_LINK_SELECTOR)) {
        link.setAttribute(
          'href',
          hrefWithSelection(
            link.getAttribute('href'),
            target.value,
            $module.ownerDocument.baseURI
          )
        )
      }
    })
  }
}

export default AddressBookPicker
