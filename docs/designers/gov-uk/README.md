# GOV.UK design in this prototype

The workspace's own `docs/best-practices/gds/` is the source of truth for
the GOV.UK Design System, the GOV.UK style guide and the Service Manual:

- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/patterns.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/styles.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/accessibility.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/language.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/service-design.md`
- `~/git/defra/trade-imports-workspace/docs/best-practices/gds/writing.md`

You never have to open these yourself: Claude reads them for every
design-producing change. The pages below are the ones that are different
in this prototype, because it is a copy of the real plants service. It
starts with what the real service loads: GOV.UK Frontend 6.4, the MoJ date
picker and an accessible autocomplete. That keeps every page you make close
to something the plants team can build.

When your research needs more, Claude climbs a ladder: GOV.UK first, then
MoJ, then a pattern built in your own release when you ask for it. See
[release patterns](release-patterns.md).

## The pages

1. [Components in this prototype](components.md): which GOV.UK components
   work fully here, and which show their "JavaScript off" version.
2. [Accessibility in this prototype](accessibility.md): how to check a page
   here, and the mistakes prototypes often make.
3. [Templates in this prototype](templates-in-this-prototype.md): the layout,
   caption, buttons, error summary and hidden fields every page here shares.
4. [Design gaps](design-gaps.md): what happens when the design asks for
   something that is not built.
5. [Release patterns](release-patterns.md): how to have something GOV.UK
   does not have built in your release, and how it reaches the real service.

## Asking Claude

You do not need to learn the class names. Say what you want, for example
"make the gap under the heading smaller" or "make this a table", and Claude
picks the GOV.UK class or component. To bring a page over from the old
Prototype Kit prototype, say "re-create this page from the old prototype".
