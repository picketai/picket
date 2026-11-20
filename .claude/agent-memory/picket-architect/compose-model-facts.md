---
name: compose-model-facts
description: What `compose config --format json` keeps and drops (profile-disabled services, service-level x- keys), and the verified JSON shapes of docker/podman info, read from compose-go and the docs on 2026-11-14
metadata:
  type: reference
---

Read from compose-go `types/project.go` and `types/types.go` (main) on 2026-11-14 for item 20261114-standard-test-environment-and-env-verbs:

- `Project.MarshalJSON` writes `name`, `services`, networks, volumes, secrets, configs and every top-level extension (`x-...`). Service-level and nested `Extensions` carry `json:"-"`, so an `x-` key under a service is lost in the JSON model.
- Services disabled by an inactive profile live in `DisabledServices` (`json:"-"`), so they are missing from `config --format json` unless their profile is enabled; `config --profiles` lists the profile names.
- Port `published` is a string with omitempty: absent means no fixed host port. Healthcheck `test` is a list; `disable` a bool.
- `docker info --format json` has `OSType` (`linux` or `windows`) and `MemTotal`; `podman info --format json` has `host.os` and `host.memTotal`.
- `docker compose up --wait` implies detached; `down --volumes` removes named and anonymous volumes but never external ones; `--rmi local` skips custom-tagged images.

- Compose 2.40.3 refuses `-p`, `-f`, `--project-directory` and `--profile` after any subcommand (`config`, `version`, `build`, `up`, `stop`, `down`, `port` checked): `unknown flag: --profile`, `unknown shorthand flag: 'p' in -p`. `docker compose <flags>` parses flags without a daemon, so it probes this even when `docker info` fails.
- `podman compose` writes an ANSI banner line first and `Error: executing <provider> <args>: exit status N` last on stderr, so the last stderr line never holds the cause.

- `compose run -e NAME` with no value takes NAME's value from Compose's own environment (`getEnvironment(project.Environment.Resolve)` in `cmd/compose/run.go`, same at v2.40.3 and main, read 2026-11-18), so a secret can reach a one-off container by name only, never in argv.

**How to apply:** design env features against the JSON model, enable every profile when reading it, and keep Picket data in a top-level `x-` block. Related: [[machine-node-and-test-runs]].
