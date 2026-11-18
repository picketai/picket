# Testing: cases

A case is a card in the saved-scenario grammar, run whole on the item's stack by `picket test case`. The kernel adds the header; you write the step lines.

1. Name the case: `--criterion <T-N.x>` from the tested list, `--kind <kind>` from the matrix, and `--intent <words>` saying the one risk it checks, such as `a zero-price item gives a total of 0`.
2. Take each request's method, path and body fields from a source: the brief, the request, or an unchanged document of the project (`README.md`, a `docs/` folder, an OpenAPI file). Find a document with Glob and open it with Read by path; a Grep from the project root is refused. Write no field name that no source shows. The normal case of an endpoint runs first; once it passes, each later case of that endpoint keeps its body and changes the one value it tests.
3. Write the step lines, one per line:
   - `request <METHOD> {<service>}<path>` sends to a service of the environment, never to a host name. Under it, `  header <name>: <value>` and `  body <json>` lines, indented.
   - `expect status <code>` and `expect contains "<text>"` check the answer of the request above them.
   - `capture <name> json <key>` or `capture <name> header <name>` keeps a value for later steps as `{<name>}`.
   - `wait <n>s` pauses, at most 20 seconds.
4. Make the data your own. Every value the case creates carries the run key: `PKT-{run}` in a name, a reference or an email, so two runs never collide and a kept case can run again. Dates are relative: `{date:+1d}`.
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

6. Run it, the steps on stdin in a quoted heredoc so nothing in them expands:

   ```
   picket test case <id> --criterion T-2.1 --kind boundary --intent "an empty basket is refused" <<'EOF'
   request POST {orders}/orders
   ...
   EOF
   ```

7. Read the printed line. `C-04 T-2.1 boundary passed` needs nothing more. A failure was already run twice from the start; its line gives the step and the answer, and the classify command to run next. `through a mock: <service>` means a mock stood in for a real service on the way: the case proves the item, not the real service.
8. A refusal lists the card's problems: a host name, an unknown placeholder, a literal secret in a header or body. Fix the card and run it again; a refusal records nothing and does not count against the cap.
