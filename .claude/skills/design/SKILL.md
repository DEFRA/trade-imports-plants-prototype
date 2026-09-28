---
name: design
description: 'The front door for a designer in the plants prototype: they say what they want in their own words, and this works out the outcome, splits it into parts and sends each part to the right steps, using the "Working out what they want" section of AGENTS.md. It holds no routing of its own. Use when a designer says "design", "use the design skill", "/design", "help me design", "help me with the prototype", "I need…", "I want…", "can we…", "can you make it so…", "prototype this", or opens with a goal rather than a single change (a demo, a research round, a ticket for the developers, a feature the real service lacks). NOT for a request that already clearly matches one row of the AGENTS.md phrase table (follow that row''s steps file straight away), and NOT for work on the prototype itself on a maintain/* branch.'
---

# Design

This skill is a handle, not a second router. The one routing source is
`AGENTS.md`. Never copy its tables here.

1. **Read `AGENTS.md`, "Working out what they want"**, and follow its six
   steps for the designer's request: name the outcome, split it into parts,
   map each part with the Outcomes table and then the Phrases table, check
   what already holds, do the parts in order, and ask one plain question only
   when the request is truly ambiguous.
2. **A list of notes goes to the `design-session` workflow.** Notes from a
   crit, a review or feedback, however many, or four or more separate
   changes: see `AGENTS.md`, "Workflows" (launch by `scriptPath`, as
   `CLAUDE.md` says). Without the Workflow tool, follow the manual steps in
   `.claude/workflows/README.md`.
3. **Follow each part's steps file** (`.claude/skills/<skill>/SKILL.md`,
   named in the tables) and the load-bearing rules in `AGENTS.md`.
4. **Always end the way every change ends** (`AGENTS.md`, "How every change
   ends"):
   1. check it (`npm run designer:check -- --set <id>`)
   2. show it (`npm run designer:show -- --set <id> --pages <pages> --before`,
      the gallery and links to click)
   3. the hand-off line, word for word: "If this should become part of the
      real service, say 'hand this to the real team' and I will prepare a
      brief and a patch for the plants-frontend team."

   When the request changed nothing (the designer only asked what they can
   do, or every part already held), say so, skip the check and show the
   pages as they are, and still end with the hand-off line.

Never ask the designer to name a skill, a workflow or a file.
