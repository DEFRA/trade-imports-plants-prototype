# Accessibility

Every GOV.UK service must meet the Web Content Accessibility Guidelines
(WCAG) 2.2 at level AA. That is the law for public sector websites (the Public
Sector Bodies Accessibility Regulations 2018, and the Equality Act 2010).

GOV.UK components already meet it. Most accessibility problems come from how
a page puts them together, so the checks below are about your page, not the
components.

## What every page must do

- **One `h1`, then headings in order.** `h2` under `h1`, `h3` under `h2`.
  Never skip a level to get a smaller size: change the class instead.
- **Every field has a label.** When a page asks one question, the question is
  the label or legend and also the page heading.
- **Errors are linked and specific.** The error summary links to each field,
  and each field's error message says how to fix it ("Enter the arrival
  date", not "Invalid date").
- **Nothing depends on colour alone.** A status tag has words, not just a
  colour.
- **Links make sense on their own.** "View notification GB.2026.123", not
  "click here". Hidden extra words (`govuk-visually-hidden`) can add context
  for screen readers.
- **It works with a keyboard.** Every link, button and field can be reached
  and used with Tab, Enter and Space, in a sensible order.
- **It works at 320px wide and at 400% zoom** without scrolling sideways.
- **It works without JavaScript.** Build the page so the plain version is
  usable; scripts only improve it.

## How to check

- `npm run designer:show` runs an automatic check (axe) on every page it
  photographs and lists what it finds in the gallery. Automatic checks catch
  about a third of problems.
- Use the page with only a keyboard.
- Zoom the browser to 400%.
- Turn on your computer's screen reader (VoiceOver on a Mac, Narrator on
  Windows) and listen to the page heading and the first question.

## Things that often go wrong in prototypes

- A heading made smaller by using `h4` instead of a class.
- A table used only for layout.
- A custom dropdown or pop-up that a keyboard cannot operate.
- Text in images.
- Placeholder text used instead of a label or hint.
- Content hidden behind hover.

The GOV.UK components avoid all of these. If a design needs one of them, log
it as a design gap and talk to the team before research.
