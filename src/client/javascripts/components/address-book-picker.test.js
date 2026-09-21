// @vitest-environment jsdom

import AddressBookPicker from './address-book-picker.js'

const renderPicker = () => {
  document.body.innerHTML = `
    <form data-module="app-address-book-picker">
      <input type="radio" name="contactAddress" value="address-1">
      <nav class="govuk-pagination">
        <a href="/notifications/reference/consignment/contact/select?q=oak&page=2">Page 2</a>
      </nav>
      <button type="button">Unrelated control</button>
    </form>
  `
  const form = document.querySelector('form')
  const picker = new AddressBookPicker(form)
  expect(picker).toBeInstanceOf(AddressBookPicker)
  return form
}

describe('AddressBookPicker', () => {
  it('Should carry a newly ticked address through every pagination link', () => {
    const form = renderPicker()
    const radio = form.querySelector('input[type="radio"]')

    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    expect(form.querySelector('a').getAttribute('href')).toBe(
      '/notifications/reference/consignment/contact/select?q=oak&page=2&selected=address-1'
    )
  })

  it('Should leave pagination alone when another control changes', () => {
    const form = renderPicker()
    const link = form.querySelector('a')
    const original = link.getAttribute('href')

    form
      .querySelector('button')
      .dispatchEvent(new Event('change', { bubbles: true }))

    expect(link.getAttribute('href')).toBe(original)
  })
})
