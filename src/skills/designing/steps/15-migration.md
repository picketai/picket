# Designing a schema or data migration

Read this before writing the phases of a design that changes a schema, a stored file format or the shape of data at rest. It shapes the phases; the decisions stay in `10-design.md`'s rules.

The order is fixed: expand, migrate, contract. Each step is its own phase, and every phase leaves the system working for the code that runs before and after it.

## Expand

Add, never change in place. A new column, table, field or file version arrives next to the old one, and the code reads both shapes. Example: invoices gain `status` with a default of `draft`; the reader treats a missing `status` as `draft`, so old records still load.

Write the new shape on every write from this phase on, so the backlog of old records only shrinks.

Build an index without locking the table where the store allows it (`CREATE INDEX CONCURRENTLY` in PostgreSQL, `ONLINE = ON` in SQL Server). Where it does not, say so in a `RISK-###` with the expected lock time.

## Migrate

Backfill the old records in batches:

- Batches are small and bounded (for example 1,000 rows), so one batch never holds a long lock or a long transaction.
- The backfill is idempotent: running it twice leaves the same result, so a retry after a crash is safe. Select only the rows still in the old shape.
- It is resumable: it picks up where it stopped, by key or by a checkpoint it records, not from the start.
- It reports progress and a final count, and the phase's criteria check that count against the old-shape rows left (zero).

## Contract

The destructive step comes last, alone, in its own phase, after every reader and writer uses the new shape. Mark that phase [IRREVERSIBLE] in its title and on the decision that calls for it: dropping a column, deleting the old file version, removing a public field. The kernel gives such a phase its own gate, so no run grant crosses it.

Deprecate before you remove. A public field or endpoint first goes behind an adapter or a flag that keeps old callers working, with a phase that measures or announces the switch; removal is the contract phase.

## Down paths

Every reversible step has a down path, and a test proves it: apply the step, reverse it, and the data and code are as before. Expand and migrate are reversible; contract is not, which is why it waits until nothing needs the old shape.

## Criteria to write

For each migration phase, at least: the old and the new shape both load; the backfill run twice gives the same result; a stopped backfill resumes; the down path restores the previous state; and, for the contract phase, no reader of the old shape is left (a grep or a test).
