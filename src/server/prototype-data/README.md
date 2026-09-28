# Extra parties, ports and countries

Rows you add here appear in the prototype after the stub services' own rows:
in the address book pickers, the port list and the country lists.

- `_all/parties.json`, `_all/ports.json`, `_all/countries.json`: every set
- `<set-id>/parties.json` and so on: one set only

Each file is optional and holds a JSON list. The fields each kind needs, with
an example row, are in `docs/designers/example-data.md` ("Extra parties, ports
and countries") and in `rows.js`.

Check your rows with `npm run designer:examples -- check <set-id>`.

Addresses a design release's own address book pages add, change or delete
(through `src/server/app/services/ins-address-book/`) are laid over the
parties here too, for that release only, so the pickers see them. They are
kept in `.cache/designer/data/`, never in these files.
