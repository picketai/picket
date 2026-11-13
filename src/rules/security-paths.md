# Security paths

The security paths are `src/auth/`, `src/crypto/`, `src/security/`, `Authentication/` and `Authorization/`, plus any the project lists. A change under one of these paths always takes the design lane, whatever `picket admit` said from the text alone: re-run admit with the request in a quoted heredoc and `--touched <paths>` (`picket admit --request - --touched <paths> --human`), and switch to the skill it names.

The reviewer loads the full security checklist (`picket:reviewing`'s `patterns-security` checklist) at every size class. Run grants never span a phase that touches these paths; each such phase takes its own approval. Verification by driving the real entry point is mandatory, never exempt.

Never log, echo, or write to an artifact any secret, key, token or password value; name the variable, not the value. Compare secrets in constant time. Fail closed: a missing or malformed credential is a denial, not a pass.

Projects extend the path list in `.picket/config.json` under `security_paths`; the kernel reads that file.
