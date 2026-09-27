# Instructions for coding agents

This repo is a prototype of the plants import notification service, built for designers. If you are Cursor, Codex or any agent other than Claude Code:

1. Read `CLAUDE.md` first and follow its load-bearing rules. They apply to every agent.
2. Route each request with the table in `CLAUDE.md`, then follow the matching `.claude/skills/<skill>/SKILL.md` step by step.
3. Read the matching file in `.claude/rules/` before you change copy, templates, sets, example data or files that belong to the real service.
4. If you cannot run the workflows in `.claude/workflows/`, each skill that uses one lists the same steps to run one after another.
5. The designer's own guide is `PROTOTYPE.md`, and the designer docs start at `docs/designers/README.md`.
