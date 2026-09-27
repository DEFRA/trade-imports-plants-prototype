# research-session.json

The tasks for a research round, kept in the research release at
`src/server/app/sets/<set-id>/research-session.json`. `designer:research --
sheet <set-id>` reads it to make the participant sheet. It is an ordinary file
in the release: save it with `share-my-change` like any other change. It is
**not** part of research mode, so turning research mode off leaves it alone.

```json
{
  "title": "Arrival dates research",
  "sessionDate": "2 October 2026",
  "deployedUrl": "https://the-deployed-prototype-address",
  "tasks": [
    {
      "title": "Tell us when the plants will arrive",
      "example": "arrival-task",
      "startsOn": "arrival-details",
      "notes": "Plants for planting, not yet arrived"
    },
    {
      "title": "Start a new notification",
      "startsOn": "dashboard"
    }
  ]
}
```

| Field              | Needed | What it is                                                                                                                                                                                                             |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`            | no     | The sheet's heading. Defaults to "Research session: <set-id>".                                                                                                                                                         |
| `sessionDate`      | no     | Shown under the heading, as the designer writes it.                                                                                                                                                                    |
| `deployedUrl`      | no     | The deployed prototype's address. Without it the sheet leaves the deployed links blank. `--deployed-url` on the command line wins over it.                                                                             |
| `tasks`            | yes    | One entry per task, in the order participants do them.                                                                                                                                                                 |
| `tasks[].title`    | yes    | What the task is, in the words the facilitator uses.                                                                                                                                                                   |
| `tasks[].example`  | no     | The id (`slug`) of the example that stops at the task's starting page. The sheet links to `/examples/<set-id>/<example>`, which keeps working after a restart. Without it, the task starts on the release's dashboard. |
| `tasks[].startsOn` | no     | The page the task starts on, shown on the sheet as a reminder.                                                                                                                                                         |
| `tasks[].notes`    | no     | Anything the facilitator should know.                                                                                                                                                                                  |

Check each `example` id is real with `npm run designer:examples -- links <set-id>`.
