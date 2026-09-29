# Your first hour

This guide takes you from nothing to a changed page you can show someone. It
takes about an hour the first time, most of it waiting for installs.

Before you install anything, you can see the plants prototype's demo page:
short videos of the most important journeys, most important first:
`https://defra.github.io/trade-imports-plants-prototype/`.

You can do every step by asking Claude Code in plain words. You never need
to know the names of Claude's skills or commands: just say what you want. If
Claude seems lost, say "use the design skill". Each step says what to ask,
and the command it runs, so you can also do it yourself.

## Before you start

Do these once. Ask someone who has done it before if a step is new to you.

1. **A GitHub account in the DEFRA organisation, with write access to the
   prototype.** Ask the prototype maintainer (the person who looks after this
   prototype; ask in your team if you do not know who). Without write access
   you can run and change the prototype, but not share your changes.
2. **Git, with your name and email.** Macs ask to install it the first time
   you type `git` in a terminal. Then, with the email on your GitHub account:

   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

3. **The workspace on your computer, not just the prototype.** In a
   terminal, in your home folder:

   ```
   git clone https://github.com/DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace
   ```

   This one clone holds the prototype (under `repos/`), the real plants
   service it copies, and everything Claude reads to build sympathetically
   with the real thing. The exact path matters: every command below expects
   it.

4. **Node.js.** The prototype's own version is in its `.nvmrc` file (Node
   24). If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm install`
   in `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype`.
5. **Claude Code.** Install it from
   [claude.com/claude-code](https://claude.com/claude-code), sign in, and
   start it at the workspace root
   (`~/git/defra/trade-imports-workspace`) — not in the prototype's own
   folder. That is what lets Claude work out what you want and read the
   real service while it builds for you.
6. **The GitHub command line, for pull requests (optional).** Install `gh`
   from [cli.github.com](https://cli.github.com), then run `gh auth login`
   and follow its questions. Without it, Claude gives you a link to open each
   pull request in your browser instead.
7. **On Windows**, use Git Bash (it comes with Git for Windows) or WSL for
   the terminal: the prototype's start command does not run in Command
   Prompt or PowerShell.

## Getting set up

Once you have Node.js and Claude Code, run these two commands once, from
anywhere:

```
npm --prefix ~/git/defra/trade-imports-workspace/tim link
tim prototype setup
```

The first puts `tim`, the workspace's own command line, on your path. The
second installs this repo's packages, checks your GitHub and Jira
sign-in, and writes a note so Claude knows to work with you as a designer
from here on. It prints what is still missing, if anything, and what to
run to fix it.

## What you need each time

- Claude Code open at the workspace root
  (`~/git/defra/trade-imports-workspace`). Every command below still runs
  against the prototype, wherever your terminal is standing.

You do not need a database, other services, passwords or environment
variables. The prototype makes up its own data.

## 1. Check your computer

Ask: **"I'm new, what can I do here?"** or **"Run the prototype"**. Claude
does steps 1 to 3 for you, then shows you what you can ask for.

Or run:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:preflight
```

It checks these things and changes nothing:

- your Node version
- that the prototype's packages are installed
- that the browser used for pictures is installed
- that port 3103, the prototype's address, is free
- that git knows your name and email
- that the prototype can read the real service's code, for hand-offs
- that the GitHub command line is installed

Each line starts `OK`, `Needs doing` (with the command to run), `In use`, or
`Before you share` (the prototype runs, but saving or sharing needs this
first). Claude does what it can for you, such as linking the prototype to
the real service's code.

## 2. Install

`tim prototype setup` (above) already did this. If the preflight check
above says packages need installing again later, run the command its
`Packages` line prints — from the workspace root that is:

```
tim workspace install --repo trade-imports-plants-prototype
```

It runs the exact npm version the prototype expects, so it never rewrites
the package list the way a bare `npm install` would.

Then install the browser used for pictures, once:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run playwright:install
```

## 3. Run it

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run dev
```

Leave that terminal open. When it says
`Access your frontend on http://localhost:3103`, open
[http://localhost:3103](http://localhost:3103).

To stop it, press Ctrl and C in that terminal.

If it says `address already in use`, the prototype is probably already
running somewhere else, in another terminal or your editor. Open the address
anyway. To see what holds the port, run `designer:preflight` (above): it
names the program and never stops it.

Nothing here needs the workspace docker stack. It runs the same way
whether or not the stack is running.

`npm start` runs the prototype the way it runs when deployed, stub sign-in
included. Use `npm run dev` on your own computer instead — it does the same
thing, with the auto-reload a working session needs.

## 4. Sign in and look around

On your own computer you are signed in straight away: there is no password.

The first page is the **Prototypes** page. It lists every set:

- **high-risk-plants**: the real journey, the same as the real service. It
  updates every week from the real team's work. Look, but do not change it.
- **sample-journey**: a one-page placeholder. Ignore it.
- your **design releases**, once you make one: yours to change.

Open **high-risk-plants**. The dashboard already has example notifications:
drafts, submitted ones, an amended one. They are made by filling in the real
pages, so they look exactly like a trader's.

To sign in as a different organisation, open
`http://localhost:3103/auth/stub-sign-in?organisationId=example-organisation-b`.
To go back, open `http://localhost:3103/auth/sign-out`.

## 5. Where did my data go? Reset

Saving a file restarts the prototype. In the real journey that empties every
notification, and the examples come back on your next visit. A design release
keeps its notifications across restarts on your computer.

To put a set's examples back at any time, go to the Prototypes page and press
**Reset this prototype's data** under it. This empties that set for everyone
using this copy of the prototype, then makes the examples again.

To get a link straight to an example, ask **"give me the example links"**, or
run
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- links <set-id>`.
These links keep working after restarts and resets. See
[Example data](example-data.md).

## 6. Make your first design release

You never change the real journey itself. You change your own copy of it,
called a design release.

Ask: **"Start a new design release called plants-working"**.

Or run, then tidy the new lines (both from the workspace root):

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run new:set -- plants-working --from high-risk-plants --describe "My working copy" --purpose working
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:format
```

You can also skip this step: the first time you ask for a change with no
working release, Claude Code starts `plants-working` for you.

Everything in `src/server/app/sets/plants-working/` is now yours. It appears
on the Prototypes page at `http://localhost:3103/plants-working`. Press
Reset under it if its dashboard is empty.

See [Design releases](design-releases.md) for freezing, copying changes
between releases and more.

## 7. Change some words

Words live in copy files, never in the page templates. Each page has its own
folder under `src/server/app/sets/<your-release>/journeys/linear/features/`,
with `copy/copy.en.js` (English) and `copy/copy.cy.js` (Welsh).

Ask, for example: **"In plants-working, change the hint under 'Expected time
of arrival' to 'Use the 24-hour clock, like 09:15 or 17:45'"**.

Or do it yourself. Open
`src/server/app/sets/plants-working/journeys/linear/features/arrival-details/copy/copy.en.js`,
find:

```js
hint: 'Use the 24-hour clock. For example, 14:30.'
```

and change the words between the quotes. Change the same line in
`copy.cy.js`. If you do not have the Welsh, write
`'[Welsh needed] Use the 24-hour clock, like 09:15 or 17:45.'` so nobody
forgets it.

Save. The prototype restarts; refresh the page to see it. See
[Wording and Welsh](wording-and-welsh.md).

## 8. Check it

Ask: **"Check my changes"**.

Or run:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set plants-working
```

It says pass or fail, and explains every failure in plain words. See
[Checks and errors](checks-and-errors.md).

## 9. Show it

Ask: **"Show me, before and after"**.

Or run:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set plants-working --before
```

It takes pictures of the pages your change shows up on, next to how they
looked in your last saved version, and makes a gallery. Open the
`index.html` it names in your browser. It does not disturb the prototype you
have running. See [Seeing your change](seeing-your-change.md).

`--before` compares with your release's last saved version. When Claude
started your release (step 6), it saved it straight away, so `--before`
works from your very first change. Only a release you started yourself with
`npm run new:set` and have not saved yet has no "before": leave out
`--before` until you save it (step 10).

## 10. Save and share it

Ask: **"Save my work"**. Claude writes the commit message from what changed,
checks it and commits it, on whatever branch you're already on — `main`
included; you never need a branch of your own.

Then ask: **"Share this"**. Claude pushes it straight to `main` — the
deployed prototype and its demo page update once the pipeline runs. If
you'd rather share it for review first, without it touching `main` yet, say
"keep this off main" or "make a pull request": Claude then puts it on a
`design/*` branch and opens a draft pull request with the gallery in it, for
the prototype maintainer to review and merge. See
[Sharing and handing off](sharing-and-handing-off.md).

## Next

- [Where your changes go](where-changes-go.md): which files are yours.
- [Glossary](glossary.md): every word used in these guides.
- When a change is agreed and should be real, ask **"hand this to the real
  team"** or **"write this up as a story the developers can pick up"**.
- Anything else: say what you want in your own words. The table in
  [PROTOTYPE.md](../../PROTOTYPE.md) has more examples.
