# Accessibility in this prototype

The workspace's own
`~/git/defra/trade-imports-workspace/docs/best-practices/gds/accessibility.md`
is the source of truth for the WCAG 2.2 AA rules every GOV.UK service must
meet. Read that first. GOV.UK components already meet it; most
accessibility problems come from how a page puts them together, so the
checks below are about your page, not the components.

## How to check, in this prototype

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
it as a design gap (see [design gaps](design-gaps.md)) and talk to the team
before research.
