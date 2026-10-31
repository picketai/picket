# Tests

Always loaded. It covers every test an agent or the lead writes, in every lane.

Write unit tests. Add architecture tests only where the project already has them; a project without an architecture test suite does not gain one as a side effect of a phase.

Write another kind of test (integration, end-to-end, performance) only when the phase's `**Done when:**` or the fast-lane request names that kind. "The export works" names no kind; "an integration test against the staging database" does.

A unit test touches no real infrastructure: no database, no network, no clock, and no file system outside a temporary folder the test creates and removes. Pass the clock and the paths in, or use the project's test helpers for them.

Every test asserts the rule its name claims. A test that only checks that a mock was called, or that the code ran without throwing, pins nothing; prefer no new test over one of those.

Example: a test named `rounds a 0.5 fee up` calls the fee function with 1.045 and asserts 1.05. A test of the same name that asserts the rounding helper was called once does not test rounding.

Never write a test for a state the design makes impossible (a value the type or a validated input cannot hold); it pins nothing and suggests the state can occur. When a function returns a result with several fields from several branches, each branch's test asserts every field, not only the one the branch is about.
