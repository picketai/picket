# Testing: cases

A case is a card in the saved-scenario grammar, run whole on the item's stack by `picket test case`. The kernel adds the header; you write the step lines.

1. Name the case: `--criterion <T-N.x>` from the tested list, `--kind <kind>` from the matrix, and `--intent "<words>"` saying the one risk it checks, such as `a zero-price item gives a total of 0`.
2. Take each request's method, path and body fields from a source: the brief, the request, or an unchanged document of the project (`README.md`, a `docs/` folder, an OpenAPI file). Find a document with Glob and open it with Read by path; a Grep from the project root is refused. Write no field name that no source shows. The normal case of an endpoint runs first; once it passes, each later case of that endpoint keeps its body and changes the one value it tests.
3. Write the step lines, one per line:
   - `request <METHOD> {<service>}<path>` sends to a service of the environment, never to a host name. Under it, `  header <name>: <value>` and `  body <json>` lines, indented.
   - `expect status <code>` and `expect contains "<text>"` check the answer of the request above them.
   - `capture <name> json <key>` or `capture <name> header <name>` keeps a value for later steps as `{<name>}`.
   - `wait <n>s` pauses, at most 20 seconds.
   - `open {<service>}<path>` opens a page of a service in the browser; `fill "<label>" with "<value>"`, `click "<name>"` and `see "<text>"` follow it on that page. `fill` types into the one field with that label, `click` presses the one button or link of that name (or else the one element showing that text), and `see` checks that a visible element holds the text.
   - Name an element by the label or the text a user sees, never by a selector, an id or a CSS class. Use the browser words when a criterion names what a user sees; check data through requests.
4. Make the data your own. Every value the case creates carries the run key: `PKT-{run}` in a name, a reference or an email, so two runs never collide and a kept case can run again. A value a browser case submits through `fill` carries `PKT-{run}` too. Dates are relative: `{date:+1d}`. A value the case needs but does not create comes from the brief's data catalog as `{data:<entry>.<capture>}`, such as `{data:customer.id}`; the kernel runs the entry before the case. A case changes only data it created or a `create` entry made; data from any other entry is shared and read-only.
5. A case that needs a user logs in as its first request, with `{user:<role>.<field>}` placeholders the environment fills, and captures the token:

   ```
   request POST {orders}/login
     body {"user": "{user:buyer.name}", "password": "{user:buyer.password}"}
   expect status 200
   capture token json token
   request POST {orders}/orders
     header authorization: Bearer {token}
     body {"reference": "PKT-{run}", "items": []}
   expect status 400
   expect contains "items"
   ```

   A browser case can set up its data by request first, then work the page:

   ```
   request POST {orders}/login
     body {"user": "{user:buyer.name}", "password": "{user:buyer.password}"}
   expect status 200
   capture token json token
   request POST {orders}/orders
     header authorization: Bearer {token}
     body {"reference": "PKT-{run}", "items": [{"sku": "A-1", "quantity": 1}]}
   expect status 201
   open {web}/login
   fill "Email" with "{user:buyer.name}"
   fill "Password" with "{user:buyer.password}"
   click "Sign in"
   fill "Search" with "PKT-{run}"
   click "Search"
   see "PKT-{run}"
   ```

6. Run it, the steps on stdin in a quoted heredoc so nothing in them expands:

   ```
   picket test case <id> --criterion T-2.1 --kind boundary --intent "an empty basket is refused" <<'EOF'
   request POST {orders}/orders
   ...
   EOF
   ```

7. Read the printed line. `C-04 T-2.1 boundary passed` needs nothing more. A failure was already run twice from the start; its line gives the step and the answer, and the classify command to run next. `through a mock: <service>` means a mock stood in for a real service on the way: the case proves the item, not the real service. `· gap: <service> has no answer for <METHOD> <path>` means the mock's definition has no answer for that request: class the failure `environment`, never `product`. A browser step fails with what it found: `found 0 fields labelled "Email"` (no field has that label), `found 2 buttons, links or texts named "Save"` (name it by a text only one element shows), `found 0 visible texts holding "PKT-…"` (the page never showed it). A case blocked with `the environment has no browser service` cannot cover its cell this round: note the cell `blocked` with that reason, as in the results step.
8. A refusal lists the card's problems: a host name, an unknown placeholder, a literal secret in a header or body. Fix the card and run it again; a refusal records nothing and does not count against the cap.
