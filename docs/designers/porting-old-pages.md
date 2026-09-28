# Bringing over a page from the old prototype

If you have designed in the old Prototype Kit prototype (the GB notification
prototype on Heroku), you do not have to start again. Claude can rebuild one
of its pages in your design release, with the real service's GOV.UK
components, and tell you honestly how close it got.

## What to say

- "Re-create the transporter page from the old prototype"
- "Port the GB notification page for commodity details"
- "Build this Prototype Kit page here", with the page's `.html` file or a
  screenshot

Say where it goes, for example "after arrival details". If you do not, Claude
asks once. Claude uses your working release, and starts `plants-working` for
you when you have none.

## What you give Claude

Any one of these:

- the page's name ("the transporter page"): Claude finds it in the old
  prototype's code
- its `.html` view file, or the HTML pasted into the chat
- its web address on the old prototype (if it needs a password, give the file
  or a screenshot instead)
- a screenshot

A screenshot of the old page is worth adding even with the file: the gallery
puts it beside the new page.

## What you get back

- **The new page in your release**, in the right place in the journey, with
  every word in its copy file and `[Welsh needed]` for the Welsh.
- **A gallery**: the new page beside the old one, with error messages and
  phone width.
- **A fidelity table**, saved in your release as
  `docs/fidelity-<page>.md`. Each thing on the old page is marked:
  - **matched**: the same thing, built with GOV.UK components
  - **nearest**: the closest GOV.UK option, visibly different
  - **gap**: nothing could be built, usually custom styles or scripts
- **Design gaps**: every "nearest" or "gap" you can see on screen is logged
  in your release's `design-gaps.md`, so it travels with a hand-off.

## What is different from the old page

The old prototype had its own styles and scripts. This prototype only has
what the real service loads, so:

- custom colours, spacing and layouts become the nearest GOV.UK option, or a
  design gap
- a page that searched or picked from a list (transporters, say) is built on
  a pretend service, flagged "needs a real service" (see
  [Services and dashboards](services-and-dashboards.md))
- words about live animals are flagged and Claude asks you about them: the old
  prototype covered animals too

One old page per request. Ask again for the next one.

## Afterwards

Check, show and save it like any other change: "check my changes", "show
me", "save my work". See
[Saving, sharing, undoing and handing off](sharing-and-handing-off.md).
