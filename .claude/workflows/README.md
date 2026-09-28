# Workflows

A workflow is a script that runs several agents, one step after another, for
one big job. It is an accelerator, never a dependency: every workflow's skill
also lists the same steps to run by hand.

| Workflow             | Started by                    | What it does                                                                                             |
| -------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| `wording-sweep.js`   | the `change-the-words` skill  | Changes words across many pages of one release, English and Welsh together                               |
| `port-kit-page.js`   | the `port-a-kit-page` skill   | Re-creates one old Prototype Kit page in a release and grades how closely it matches                     |
| `prepare-handoff.js` | the `hand-off` skill, route 2 | Applies a release's change to the real journey on a `handoff/<slug>` branch, with its tests              |
| `design-session.js`  | `CLAUDE.md` routing           | Works through a list of requests in one release: build, check, park, one gallery, one commit per request |

## Launching a workflow

Always launch by `scriptPath`, never by name. A named launch can run an older
copy of the script.

```
Workflow({
  scriptPath: '.claude/workflows/design-session.js',
  args: {
    set: 'plants-working',
    requests: [
      "Change the hint on origin to 'The country the plants were grown in'",
      'Add a draft example stopped at commodities'
    ]
  }
})
```

Pass `args` as a real object, not as a string of JSON. A string still works
(the script parses it), but an object is clearer.

## The args contract

Every workflow here opens the same way, so they fail the same way:

1. `export const meta = { ... }` as a plain literal: name, description,
   when to use it and its phases.
2. A `MODELS` constant (see below).
3. The args-contract block, between `// >>> args-contract` and
   `// <<< args-contract`. It is the same text, byte for byte, in every
   script:
   - `parseArgs` accepts an object, or a string of JSON.
   - `requireKeys` stops the script when any key in `REQUIRED_KEYS` is
     missing. There are no defaults: pass every key.
   - `logResolvedConfig` logs exactly what the script will use.
4. Checks on the values (for example, refusing `high-risk-plants`), still
   before any agent runs.

`args-contract.test.js` keeps this true: it fails if any script's block
differs from the others, or if a missing key reaches an agent. To change the
block, change it in every script at once.

Scripts end with `await main()`, not a top-level `return`: ESLint cannot
parse a `return` outside a function, and the pre-commit hook runs ESLint.
Results reach you through `log()` lines.

## Choosing models

Each script names its models once, at the top:

```
const MODELS = { runner: 'haiku', builder: 'sonnet', judge: 'opus' }
```

- `runner` runs commands and reports what they printed. A small, fast model
  is enough. A Fable model suits it.
- `builder` edits files by following a skill.
- `judge` reads, plans, routes and grades. Use the strongest model.

Change a name here to point every step of that kind at another model. Use a
model name the Workflow tool accepts; `null` means the session's own model.

## Hosts without the Workflow tool

Cursor and other agents cannot run these scripts. Each skill that starts a
workflow also describes the same steps run one after another, and
`design-session` is simple to follow by hand:

1. Make sure there are no unsaved changes (`git status --porcelain` prints
   nothing). On `main`, make a `design/<release>-<slug>` branch; on any other
   branch that is not `handoff/*`, stay on it.
2. If the release does not exist yet (`ls src/server/app/sets/<release>/set.js`
   says there is no such file), start it: `design-release` section B, saved
   as its own commit. Otherwise check it is yours and not frozen:
   `npm run designer:where -- src/server/app/sets/<release>/set.js`.
3. For each request in turn:
   1. Pick its skill from the routing table in `CLAUDE.md`, and follow that
      skill's `SKILL.md` to make the change, skipping its check, show and save
      steps.
   2. Run `npm run designer:check -- --set <release>` (`--full` for
      `change-the-journey` and `fake-a-service`). If it fails, repair once.
   3. **It passed: keep it aside.** Stage its files by name,
      `git add -A -- <each file it changed>`. Staged files are what the
      later steps treat as landed, and what an undo of a later request goes
      back to.
   4. **It still fails: put it away.** For each file it changed, run
      `git status --porcelain=v1 -uall -- <file>`. New files (`??`) go into
      the stash in one go, so they can come back:
      `git stash push --include-untracked -m "design-session parked: request <n>" -- <new files>`.
      Every other file goes back to its staged (or saved) version:
      `git restore --worktree -- <file>`. Note the request as parked, with
      the check's plain reason.
4. Run the show once, for the whole session:
   `npm run designer:show -- --set <release> --pages changed --before`
   (with an example-data request: `--pages changed,dashboard --examples <new slugs>`).
5. Run `npm run designer:check -- --set <release> --full`.
6. Save each landed request as its own commit. Requests that changed the same
   file go in one commit together, because git cannot split one file's
   changes between two commits. For each group:
   1. `git restore --staged -- .` (takes everything off the staging area;
      nothing on disk changes)
   2. `git add -A -- <the group's files>`
   3. `git diff --cached --name-only` lists exactly those files
   4. `npm run designer:save -- -m "<first line>" -m "<body>"`, with the
      message written from `git diff --cached` following
      `.claude/skills/share-my-change/references/commit-message.md`. It
      commits what is staged, sends the checks' output to
      `.cache/designer/commit.log`, and refuses paths after the message (a
      commit with paths runs the pre-commit checks against a temporary
      staging area, which their own git tests trip over).
7. Report each request as landed (with its commit), parked (with why) or not
   done (with why), and the gallery path. Never push.
