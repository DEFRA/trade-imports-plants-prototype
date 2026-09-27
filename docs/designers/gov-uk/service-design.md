# Service design

A summary of the GOV.UK Service Manual's guidance on designing services,
aimed at the choices you make in a prototype.

## A good service

- Lets people do the whole thing they came to do, start to finish.
- Asks for as little as possible, and never for something government
  already knows.
- Has no dead ends: every page has a clear next step.
- Makes it easy to get help from a person.
- Hides how government is organised: people should not need to know which
  team does what.
- Says clearly what it is for, who can use it, how long it takes and what it
  costs.
- Works the same way, and uses the same words, everywhere.
- Uses familiar patterns, so people do not have to learn new ones.
- Works for everyone, including disabled people and people with low digital
  skills.

## Naming

A service name says what people do, in their words: "Notify us about plants
you're importing", not the name of a system or a team.

## One thing per page

Start with one question, one decision or one piece of information per page.
It is easier on a phone, saves as you go, makes errors easy to fix and shows
exactly where people get stuck. Combine questions only when research shows
people think of them as one thing.

## Good questions

- Only ask a question if you know why the service needs the answer.
- Prefer closed questions ("Is the consignment arriving in more than one
  vehicle?") to open ones ("Tell us about the vehicles").
- Let people say they do not know, when that is a real answer.
- Show a question only to the people it applies to. In this prototype, a
  question that depends on an earlier answer is a branch: the
  `change-the-journey` skill builds it.
- Add hint text only when research shows people need it. Keep it under three
  lines.

## Writing for the interface

- Cut every word that does not help: "Total cost", not "This is the total
  cost".
- Do not refer to colour or position ("the green button", "on the right").
- Be approachable, not chatty.

## Confirmation pages

A confirmation page should give:

1. the reference number
2. what happens next, and when
3. how to get in touch
4. links to anything related
5. a way to give feedback

## Research with a prototype

- Test the realistic journey, including errors: this prototype's error
  messages are the real ones.
- Use the `research-session` skill when participants need to get past
  validation, and switch it off afterwards.
- Record what you learn as changes to make, and what the toolbox could not do
  as design gaps.
