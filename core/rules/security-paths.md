# Security paths

The security paths are `src/auth/`, `src/crypto/`, `src/security/`, `Authentication/` and `Authorization/`, plus any the project lists. A change under one of these paths always takes the design lane, whatever `harness admit` said from the text alone: escalate with `harness admit --touched <paths>` and switch skills.

The reviewer loads the full security checklist (`reviewing` steps 30) at every size class. Run grants never span a phase that touches these paths; each such phase takes its own approval. Verification by driving the real entry point is mandatory, never exempt.

Never log, echo, or write to an artifact any secret, key, token or password value; name the variable, not the value. Compare secrets in constant time. Fail closed: a missing or malformed credential is a denial, not a pass.

Projects extend the path list in `.tether/config.json` under `security_paths`; the kernel reads that file.
