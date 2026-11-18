Add the mock format and stub server, and the data catalog with approved SQL files (SDR 00004, follow-up TF-006, decisions D-005, D-006 and D-011).

Mocks: a service with the role mock in .picket/env/ is defined in Picket's own small definition format and served by a stub server Picket provides, behind an adapter with a line budget. A format change is handled by recording again, never by a migration script. A pass through a mock stays flagged on the result, on the flow and on the item's closing line, which names the real services no test reached.

Data catalog: a catalog names how each kind of test data is obtained. Where no endpoint can produce data, the kernel runs a SQL file the user approved, through the database's own client, with a connection string the developer enters by hand. Scenarios keep treating data as old and shared: they create or find their own data and write only to records they created.

Out of this item: the database guards against the wrong database (TF-007), known defects (TF-008), the browser adapter (TF-009).

## Brief
purpose: Let the tester and saved scenarios run when a real dependency cannot join the test environment, and give every kind of test data a named, approved way to be obtained (SDR 00004 TF-006).
in scope: Picket's own mock definition format under .picket/env/; a stub server Picket provides for services of role mock, behind an adapter with a line budget; the mock flag on results, flows and the closing line; a data catalog naming how each kind of data is obtained; running a user-approved SQL file through the database's own client with a hand-entered connection string. Not tied to one database engine or runtime: the product owner's system is mostly dotnet and node with SQL Server 2016, and others must fit.
out of scope: Database guards against the wrong database (TF-007); known defects (TF-008); the browser adapter (TF-009); another test tool's mock format; migration scripts for a format change; use outside Claude sessions; the setting testing
