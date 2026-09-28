# Working through crit or research notes

After a crit, a review or a round of research you often have a list of
changes. Give Claude the whole list at once.

## What to say

- "Here are my notes from the crit, do all of these:", then the list
- "Work through this feedback", with the notes pasted in
- any four or more separate changes in one message

Name the design release if you have more than one. Claude uses your working
release, and starts `plants-working` for you when you have none.

## What happens

Claude runs a design session (the `design-session` workflow):

1. **One change at a time.** Each note goes to the skill that fits it
   (words, layout, journey, example data, a pretend service), exactly as if
   you had asked for it on its own.
2. **Each one is checked.** A change that passes the check is kept.
3. **Anything that fails is parked, not forced.** If a change still fails its
   check after one repair, Claude puts it aside with a plain reason ("the new
   page needs an answer no example gives yet") and moves on. Nothing that
   fails reaches your release. Parked changes come back if you ask.
4. **One gallery for the whole session**, before and after, for every page
   the session changed.
5. **One save per change.** Each change is saved on its own, with a message
   saying what changed on which pages, so you can undo any one of them later
   ("undo the green panel change"). Changes that touched the same file are
   saved together, because git cannot split one file between two saves.

Nothing is sent to GitHub. Say "make a pull request" when you are ready.

## At the end

Claude reports each note as:

- **done**, with the save it is in
- **parked**, with the reason
- **not done**, with why (for example, it needs a change to the real service:
  "hand this to the real team" prepares that)

and gives you the gallery.

## Tips

- One change per line works best. "Make the hint shorter and move the page
  after origin" is two notes.
- Say which page each note is about when it is not obvious.
- Notes about research findings often need example data too ("an example
  stopped at the commodities page"). Put those in the list as well.

## In Cursor or another assistant

The same list works, but the assistant follows the same steps one change after
another instead of as a workflow. It takes longer and ends in the same place.
