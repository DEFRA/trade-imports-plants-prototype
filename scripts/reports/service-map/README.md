# Service map

Builds a deterministic page showing how one set's pages connect: every page
as a card with its picture from the walkthrough, the arrows between pages
with each branch's condition in plain words, the task list groups as lanes,
and which obligations each page fulfils. It reads the real journey engine
and model in-process — it never parses source or guesses at behaviour.

Commands: `designer:service-map -- --set <id>` (one set, opens locally) and
`reports:service-map -- --site <folder>` (every set, for CI). See
[`cli.js`](cli.js) and `scripts/designer/service-map/cli.js`.

## How it installs a set

A set's journey normally comes together through its own
`routes-<id>.js`, which also wires up persistence, session and cookies —
none of which the map needs or wants to touch. [`install-set.js`](install-set.js)
is a generic installer that mirrors that composition root's seams
(`src/server/app/routes-high-risk-plants.js`) without them: it imports each
of a set's own files by path — `set.js`, `obligations/index.js`,
`journeys/linear/features/index.js` and `evaluation.js`,
`journeys/linear/flow/{flow,task-rows,run,entry-guard,section-captions}.js`,
`journeys/linear/features/hub/controller.js`, `journeys/linear/config.js` —
tolerating the optional ones being absent, then calls the same
`configure*`/`buildDispatch` seams the real composition root calls. Every
read afterwards runs inside `withSetContext(id, fn)`, so one process can
install and map several sets in turn without them leaking into each other.

A test asserts the only seams `unconfiguredSeamsOf(id)` reports missing
after install are the request-time ones (records, session): a new seam
added upstream fails that test instead of silently mis-drawing the map.

## Where the branches come from

The map never hand-writes "if X go to Y". [`states.js`](states.js) finds
every obligation another obligation's `applyTo` gate names as a decision
(`obligationMetadata()` over `walkObligations()`), separates a **routing**
decision (changes which page Continue goes to) from a **field** decision
(changes which questions a page shows, gates.js still finds the page
reachable), and enumerates one answer state per combination of routing
decision values, each merged over a base state so a prerequisite obligation
never masks a branch. [`graph.js`](graph.js) then asks the real navigation
functions — `nextRunTarget`, `nextInSection`, `rowEntry` — where each state
goes, and groups states that share a target into one minimised condition
per decision.

Refuses, with a plain message naming the decisions, past 256 states rather
than drawing an unreadable map.

## Opaque gates

A page or section gate that is a closure rather than declared metadata
(`gate: (scope) => scope.has('x')`) is run against a recording `Proxy` over
the real scope, in [`probe-scope.js`](probe-scope.js). Known reads get fixed
wording: `readyForCheckYourAnswers` → "when every task is complete";
`has(x)`/`answered(x)` → "when '<x's page title>' is answered". A new kind
of closure read gets no guessed wording: it stays "a rule in the page's code
allows it", and the JSON records `condition.kind: "opaque"` so it is visibly
unlabelled. Extend the known-reads table in `probe-scope.js` when a new,
common closure shape turns up, rather than widening what counts as
recognised without a fixed phrase for it.

## Titles and labels

[`titles.js`](titles.js) reads a page's title from its owning controller's
copy (`meta.id` on the controller, its sub-folder naming the copy subtree),
falling back through the hub's copy, a walkthrough heading, then the page id
humanised — always flagged `titleSource` in the JSON, and "title guessed"
on the page, when it falls all the way through. A decision's value labels
come the same way, from the owning page's own copy (`typeLabels`,
`statusLabels`), never the raw slug unless no label exists.

## Pictures

[`screens.js`](screens.js) is pure: given a walkthrough report and a set,
it picks the best walkthrough picture for each page (dropping a candidate
whose heading does not match a copy-sourced title — the walkthrough can
land on a redirect), and lists every page with no candidate under "pages no
walkthrough reaches", each with the state that would reach it (read from
the page's own `shownWhen`). It never infers a link from two pictures
appearing next to each other: the walkthrough navigates by address when it
has to, so neighbouring pictures do not prove one.

## Determinism

`service-map.json` holds only facts derived from source — no timestamp,
SHA, absolute path or picture URL. Every array has a defined order (pages in
flow order, edges by `(from, kind, to)`, obligations by manifest order), and
the object is written with `JSON.stringify(graph, null, 2) + '\n'`. A test
builds the same set twice, in one process and in two installs, and asserts
the two outputs are byte-identical, and that no string in the output
matches an absolute path or an ISO date. Keep new fields in that same
discipline: derived from source, fixed order, no run-specific values.

## Layout and rendering

[`layout.js`](layout.js) lays the page out itself, lanes as columns (task
list `GROUPS` order) and cards stacked in flow order within a lane — no
Mermaid, dagre or ELK: the shape is a near-linear spine with skips, which a
fixed grid handles, and a server-rendered SVG stays snapshot-testable as a
string. [`render.js`](render.js), [`template.njk`](template.njk) and
[`service-map.scss`](service-map.scss) build the page itself the same way
`scripts/reports/demo/` does: real govuk-frontend Nunjucks macros, Sass
compiled at build time, no client JavaScript.

## Tests

`*.test.js` sits beside each module (Vitest, run under the repo's own
`npm test`). Beyond the determinism test above: the high-risk-plants graph's
branch edges and conditions are pinned by name; a design-release fixture
(made with `new:set` into a temp root) maps with no code change specific to
the map; and a `page.gate` closure fixture proves the opaque-gate probe's
wording and its `"opaque"` fallback.

## Further reading

- `src/server/app/docs/obligation-model.md`, `flow-and-gates.md`,
  `engine.md`, `analysis.md`: the engine and model this reads.
- `src/server/app/sets/high-risk-plants/docs/`: the real journey's own
  recipes, including how a branch is added.
