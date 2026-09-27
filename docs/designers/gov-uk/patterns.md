# Patterns

Patterns are the GOV.UK Design System's tested answers to common problems:
how to ask for a date, how to check answers, how to confirm something is done.
Start from the pattern, and change it only when research shows you need to.

## Principles behind every pattern

- **One thing per page.** Ask one question, or for one piece of information,
  on each page. It works on phones, saves as you go and makes errors easy to
  fix.
- **Only ask what you need.** Every question should have a reason the service
  can state.
- **Help people understand the question.** Use hint text only when research
  shows people need it, and keep it short.
- **Prevent errors, then help people recover.** Clear questions first; clear
  error messages second.

## Asking people for things

- **Dates**: separate day, month and year boxes, or a date picker where
  people pick a date near today (as on arrival details). The error message
  says which part is wrong.
- **Addresses**: look one up, or pick one from a list, with a way to enter it
  by hand. Here, addresses come from the address book pickers.
- **Names, email addresses, phone numbers**: one text input each, sized to the
  answer.
- **Yes or no**: two radios, "Yes" and "No", side by side only when both are
  short.

## Helping people through a task

- **Complete multiple tasks**: a task list (the overview page) shows each task
  and its status, so people can do them in any order and come back later.
- **Check answers**: before submitting, show every answer in summary lists
  with Change links. Say this is the last chance to check.
- **Recover from validation errors**: an error summary at the top, linking to
  each field; an error message on each field saying how to fix it; keep every
  answer the person already gave.
- **Start using a service**: say what the service does, what people need
  before they start, and give one clear start button. The dashboard does this.
- **Navigate a service**: the service navigation is the way "up"; the back
  link is the way back.

## Page types

- **Question page**: a caption naming the section, the question as the page
  heading, the fields, then the buttons. See
  [templates in this prototype](templates-in-this-prototype.md).
- **Confirmation page**: a green panel with the reference number, then what
  happens next, contact details and a link back to the dashboard.
- **Interruption or guidance page**: information people must read before they
  carry on, with one button.
- **"There is a problem" page**: a plain explanation and what to do next.

## When a design does not fit a pattern

Build the nearest pattern here, then log what the design wants in your
release's design gaps log (see [design gaps](design-gaps.md)). That keeps the
evidence for a new pattern in one place, for the plants team to weigh up.
