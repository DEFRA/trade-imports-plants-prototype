# Change the confirmation page

## When to use it

The confirmation page shows after someone submits a notification. Use this
recipe to:

- change what is in the green panel
- add a section, such as "What happens next"
- show different content for different notifications, such as one message for
  potatoes and another for plants, or an extra message when the notification
  was late

To change only existing words, use `change-the-words`. To change the page's
layout beyond adding sections, use `match-the-design`.

## How the page works

- It only shows for a submitted notification. For anything else, it sends you
  to check your answers.
- It has no form. It shows what the controller passes to the template.
- The reference in the panel is the notification's id.
- It already has one variant: when the stored late indicator says the
  notification was late, it shows an "Important" banner with the timing rule.
  Copy that pattern for a new variant.

## Files in a release

`<journey>` means `src/server/app/sets/<release>/journeys/linear`.

- `<journey>/features/confirmation/template.njk`: the page's markup
- `<journey>/features/confirmation/copy/copy.en.js` and `copy.cy.js`: its
  words
- `<journey>/features/confirmation/controller.js`: what the template receives

## Steps

### Add a section, such as "What happens next"

1. Add the words to `copy/copy.en.js`. A list of paragraphs can be an array:

```js
  whatHappensNext: {
    heading: 'What happens next',
    body: [
      'We will check your notification.',
      'We will email you if we need more information.'
    ]
  },
```

2. Add the same keys to `copy/copy.cy.js`. With no Welsh from the designer,
   write `'[Welsh needed] <the English>'` for each string.
3. In `template.njk`, add the section where the designer wants it, using
   GOV.UK classes only:

```njk
  <h2 class="govuk-heading-m">{{ copy.whatHappensNext.heading }}</h2>
  {% for paragraph in copy.whatHappensNext.body %}
    <p class="govuk-body">{{ paragraph }}</p>
  {% endfor %}
```

### Change the panel

The panel is `govukPanel({ titleText: copy.title, html: referenceHtml })`.
Change `copy.title` or `copy.reference` for the words. To add a line inside
the panel, add it to the `referenceHtml` block at the top of the template. The
panel is always green: that is the GOV.UK pattern for a confirmation. Any other
colour is a design gap for `match-the-design`.

### Show different content for different notifications

Decide in the controller, choose words in the copy, and show them in the
template. Never write a sentence in the controller.

1. In `controller.js`, pass the fact the variant depends on to the view. It
   already reads `answers`. For example, add
   `commodityType: answers.commodityType` to the object passed to `h.view`.
2. In both copy files, add the words as a list keyed by that fact:

```js
  nextSteps: {
    potatoes: 'Keep the potatoes where they are until they have been inspected.',
    'plants-for-planting': 'An inspector may contact you to arrange a check.',
    'wood-and-cut-trees': 'An inspector may contact you to arrange a check.'
  },
```

3. In `template.njk`, show the matching words:
   `<p class="govuk-body">{{ copy.nextSteps[commodityType] }}</p>`.
   Wrap it in `{% if copy.nextSteps[commodityType] %}` if some notifications
   should show nothing.

The facts you can use are the answers (`answers.<fieldName>`) and the
existing `late` flag. The field names are in the set's
`obligations/sections/` files.

## What you will see

Open a submitted example. The confirmation page shows the new panel wording,
the new section, or the variant that matches that example.

A draft notification cannot show this page. To see a variant, the designer
needs a submitted example of that kind. `example-data` can add one, for
example a submitted potato notification and a submitted plants notification.

## How to check it

1. For a change to the panel, the reference or the words:
   `npm run designer:check -- --set <release> --full`. For a variant that
   changes which confirmation a notification reaches, run
   `npm run designer:check -- --set <release> --walk` instead (it includes
   `--full`: never run both). The walk ends on the confirmation page for every
   example.
2. `npm run designer:show -- --set <release> --pages confirmation --before`.
   Read the screenshot. For a variant, check one example of each kind. Leave
   out `--errors`: the page has no form, so it has no error state.
3. Give the designer the link to each submitted example.

## Hand-off notes

- New words on this page are provisional until content design signs them off.
  The brief lists them, with any Welsh still needed.
- Record the recipe as `confirmation-variant` in the commit message.
