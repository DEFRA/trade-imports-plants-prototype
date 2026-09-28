@AGENTS.md

# Claude Code only

`AGENTS.md` above is the one full source of rules for this repo. These
notes apply only in Claude Code.

## Rule files load themselves

Claude Code loads each file in `.claude/rules/` on its own when you touch
a file its `paths:` glob matches, whether the session is rooted here or
at the workspace root. Other agents read them by hand, as `AGENTS.md`,
"Extra rules for some files", says.
