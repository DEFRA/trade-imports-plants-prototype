# GOV.UK design in this prototype

Short summaries of the GOV.UK Design System, the GOV.UK style guide and the
Service Manual, written for designers working in this prototype. Each page
stands alone: you do not need anything outside this repo to use them.

This prototype is a copy of the real plants service. It can only use what the
real service loads: GOV.UK Frontend 6.4, the MoJ date picker and an accessible
autocomplete. No custom Sass or JavaScript. That keeps every page you make
close to something the plants team can build.

## The pages

1. [Components](components.md): what each GOV.UK component is for, and which
   ones work fully here.
2. [Patterns](patterns.md): the standard ways to ask for things and to help
   people through a task.
3. [Styles](styles.md): type, spacing, layout and colour, and the classes
   that set them.
4. [Accessibility](accessibility.md): what every page must do, and how to
   check it.
5. [Language](language.md): the GOV.UK style guide essentials for words on
   the page.
6. [Service design](service-design.md): what makes a good service, one thing
   per page, good questions.
7. [Templates in this prototype](templates-in-this-prototype.md): the layout,
   caption, buttons, error summary and hidden fields every page here shares.
8. [Design gaps](design-gaps.md): what happens when the design asks for
   something the toolbox cannot do.

## Asking Claude

You do not need to learn the class names. Say what you want, for example "make
the gap under the heading smaller" or "make this a table", and the
`match-the-design` skill picks the GOV.UK class or component. To bring a page
over from the old Prototype Kit prototype, say "re-create this page from the
old prototype" and the `port-a-kit-page` skill does it.
