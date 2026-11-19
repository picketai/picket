Add the database guards deferred from the first version (SDR 00004 follow-up TF-007, its D-006 and RISK-001), with the two follow-ups of SDR 00005 folded in (TF-001 and TF-002).

Guard against the wrong database: today a shared database is protected only by the developer's care with the connection string. The project declares which servers and databases its data services may reach, and picket data run refuses a connection that names any other, before anything runs. The gate packet and the close line print the server and database of each SQL run.

Confirm at the point of use (SDR 00005 D-002): picket data run asks the user through the proven permission dialog on every run, showing the entry, the file, its digest, the server and the database. It reuses the escalation route, which asks only in permission modes where the dialog is proven and refuses when a saved allow rule could approve without a dialog. Where no dialog is proven the run is refused.

Run the bytes that were shown (SDR 00005 D-003): the kernel runs a snapshot of the bytes whose digest was checked, so a file changed between the check and the run cannot reach the database.

The stored approval stays as a record (SDR 00005 D-004): picket data approve still records what the user read; it is shown in the dialog and at close and no longer authorises a run on its own.

Not tied to one database engine or connection form. Out of this item: known defects (TF-008), the browser adapter (TF-009), the sandbox spike (SDR 00005 TF-003), the review checklist row (SDR 00005 TF-004).

## Brief
purpose: Make it impossible for picket data run to reach a database the project did not declare, or to run SQL the user did not confirm at that moment (SDR 00004 TF-007, SDR 00005 TF-001 and TF-002).
in scope: A declared list of the servers and databases a data service may reach, and the refusal of any other connection; picket data run asking through the proven permission dialog on every run and refusing where no dialog is proven; running a snapshot of the checked bytes; the server and database of each run on the gate packet and the close line; picket data approve kept as a record. The product owner's database is SQL Server 2016, and other engines and connection forms must fit.
out of scope: Known defects (TF-008); the browser adapter (TF-009); the sandbox spike (SDR 00005 TF-003); the Se4 review checklist row (SDR 00005 TF-004); signing or encrypting state files; new guard.bash spellings; the setting testing
