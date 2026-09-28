# A home page across plants, animals and products

The designer says: "A home page across plants, animals and products", "a
front door where the trader picks what they are importing", or "one dashboard
for all my notifications".

## Say this first

The real front door is not plants-frontend's. It belongs to the Import
Notification Service frontend (ins-frontend), which also owns the address
book: the header's "Address book" link already points there. Anything built
here is a picture of that page for research and design, and the hand-off brief
must say "belongs to ins-frontend, not plants-frontend". The plants team can
only link to it.

## How to build it

A home page is its own small set, made from the `sample-journey` placeholder:
one page, no questions, no notifications. It lives at its own address, never
at `/`: the root is always the chooser.

1. Make the set. `sample-journey` is the default, so:

   ```bash
   npm run new:set -- plants-home --describe "Cross-commodity home page for research"
   ```

   It prints the new set's address, for example
   `http://localhost:3103/plants-home`. (`design-release` does this step for
   you and explains the choices.)

2. The page is `src/server/app/sets/plants-home/journeys/linear/features/welcome/`.
   Its `controller.js` renders `template.njk` at the set's own address. Give it
   a `copy/` pair (`copy.en.js` and `copy.cy.js`) and move its words there:
   the placeholder writes them straight into the controller. The copy also
   carries the placeholder's saved transporters example
   (`features/saved-transporters/`) and the welcome page's link to it. A home
   page does not need them: delete that folder, take
   `savedTransporters` out of `features/index.js`, and drop the `example`
   link from the welcome controller and template.

3. Build the page from the toolbox (see
   `.claude/skills/match-the-design/references/layout-patterns.md`):
   - an `h1` and a short paragraph
   - one `govukSummaryList` card per commodity (plants, animals, products of
     animal origin), each with a line saying what it covers and a link or
     start button to that journey
   - for a commodity this prototype does not have, a grey `govukTag`
     ("Not in this prototype") and no link

4. Link to other sets by their address, never by importing them. A set never
   imports another set (`set-isolation` in `npm run lint` refuses it). In the
   controller, the release's own address is `dashboardPath()` from
   `shared/paths.js`; another set's address is `/<set-id>`, for example
   `/high-risk-plants` or `/plants-dr2`. To list every set that is running,
   read them from the set registry, which is shared platform code and allowed:

   ```js
   import {
     currentSetBase,
     mountedSetIds,
     withSetContext
   } from '../../../../../../shared/set-context.js'

   const otherSets = () =>
     mountedSetIds()
       .filter((setId) => setId !== 'plants-home')
       .map((setId) => ({
         setId,
         href: withSetContext(setId, currentSetBase)
       }))
   ```

   Call `otherSets()` inside the handler, not at the top of the file: sets
   mount after the file loads. Names and descriptions for each card go in this
   set's copy, keyed by set id.

5. "All my notifications across commodities" is a fake: no service lists a
   trader's notifications across plants and animals today (the ins-backend
   read model is where one would come from). This set cannot read another
   set's notifications either, so counts from a plants release are out of
   reach. If the design needs the list, build it as example rows in this set's
   copy, clearly marked as example content, and log it.

## Flag it

Two design-gap rows in `src/server/app/sets/plants-home/design-gaps.md`:

```text
| welcome | A home page across plants, animals and products | A set made from sample-journey with a card per commodity | Needs a real service: the real front door belongs to ins-frontend (the Import Notification Service frontend), not plants-frontend. | <frame> |
| welcome | Every notification, across commodities, in one list | Example rows written into copy | Needs a real service: no service lists a trader's notifications across commodities; ins-backend's read model would be the source. | <frame> |
```

## Check it

1. `npm run designer:check -- --set plants-home --full`
2. `npm run designer:show -- --set plants-home --pages welcome` (the page
   keeps the placeholder's name, `welcome`, in `features/welcome/page.js`)
3. Click every link on the page in the running prototype: each must open the
   set it names.
