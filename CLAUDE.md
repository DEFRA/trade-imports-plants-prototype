@AGENTS.md

# Claude Code only

`AGENTS.md` above is the one full source of rules and routing for every agent. These notes apply only in Claude Code.

## Launching a workflow

Launch every workflow with the Workflow tool by `scriptPath`, never by name (a named launch can run an older copy of the script), with every argument filled in. For example `scriptPath: '.claude/workflows/design-session.js'` with `args: { set: 'plants-working', requests: ['…'] }`. See `.claude/workflows/README.md`.

## Rule files load themselves

Claude Code loads each file in `.claude/rules/` on its own when you touch a file its `paths:` glob matches. Follow it when it appears. Other hosts read them by hand, as `AGENTS.md`, "Extra rules for some files", says.

## A missing hook script

A "missing hook script" message (`sonar-secrets` or `sonar-analyze.sh`) means the prototype's own Claude Code settings are not in place yet: see "For maintainers" in `README.md`. It is harmless. Carry on, and tell the designer in one line that the prototype maintainer knows about it. Until then there is no automatic edit guard, so rule 1 matters all the more.
