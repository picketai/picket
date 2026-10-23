# Security floor (always loaded; full-file reads on security paths)

These rows run at every size against every changed file. When `security_path` is true, also read each changed file under a `## Security paths` entry in full (not hunks) and load `20-patterns-core.md` in full.

## Checks

| # | Check | Fail condition | Severity |
|---|---|---|---|
| Se1 | Secret in source | A string literal that looks like a password, token, API key, or connection string is hard-coded in a changed file | Critical |
| Se2 | Injection | User-supplied input is concatenated into a SQL query, shell command, or OS path without parameterisation or sanitisation | Critical |
| Se3 | Insecure default | Security-sensitive configuration (CORS `*`, `allowUnsafeEval`, `disableSSLVerification`, `DEBUG=true`) is hard-coded to an insecure value in non-test code | Critical |
| Se4 | Guard bypass surface | A changed guard (auth filter, validator, trigger, analyzer rule, architecture test) leaves an input uncovered, or reads state a lower-trust actor can change, so the callers that trust it are wrong | Critical |

## Reading a guard

The fact that an invariant is machine-enforced is out of scope; the machine doing the enforcing is code like any other, and everything downstream trusts it. A wrong guard is worse than no guard because it turns "checked" into "assumed". For every changed guard, enumerate: every input it does not cover, every state it reads, and who can change that state. Cite the guard's `path:line` and the trusting caller's `path:line`.
