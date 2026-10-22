# Design red flags (medium and large)

Eight shapes that look fine in one file and hurt the next reader, who sees only the files they opened and copies the nearest example. Judge only code the diff adds or reshapes; an old instance next to the change is out of range.

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Rf1 | Shallow module | The diff adds a module, class or function whose interface is about as large as what it hides: callers pass through every option and learn every case, so it removes no knowledge | Minor |
| Rf2 | Information leakage | One design decision (a file format, a key layout, a retry rule) is encoded in two or more modules the diff touches, so changing it means editing all of them in step | Major |
| Rf3 | Temporal decomposition | Code is split by when it runs (read, then parse, then save) instead of by what it knows, so the same knowledge (the record's shape) is spread over each step | Minor |
| Rf4 | Pass-through method | An added method only forwards its arguments to another with the same signature and adds no rule, check or translation | Minor |
| Rf5 | Split ownership | One piece of state is written by two or more modules the diff touches, with no single owner deciding its valid changes | Major |
| Rf6 | Two ways to do one task | The diff adds a second way to do a task the code base already does (a second HTTP client, date formatter or config reader) and leaves both in use | Major |
| Rf7 | Importable internals | A module's internal helper or state is exported only so another module or a test can reach it, and the diff adds a caller outside the module | Minor |
| Rf8 | Hand-synced list | Two or more lists (an enum and a switch, a route table and a doc table, a key list in code and in a schema) must be kept equal by hand, the diff edits one or adds one, and no test or type ties them | Major |

Each finding names the two places involved (`path:line` and `path:line`) and the fix that leaves one: one owner, one copy, one way, or a test that fails when the lists differ. When a red flag is the shape the plan asked for, report it once as a note to the architect, not as a developer defect.
