---
icon: lucide/flask-conical
---

# How to set up testing

Picket can test a finished change the way its users will meet it: on a running copy of your system. For that it needs a test environment, which this guide builds in four steps.

Testing is optional. Without an environment everything else works, and the closing block of a work item says `Tested: no environment`.

!!! warning "New in the alpha"

    The test stage is built and covered by Picket's own tests, but it has not yet run on a real project's stack. Expect rough edges, and check the result of each step.

## Before you start

You need Docker or Podman on the machine, running Linux containers, with Compose version 2 or later.

The commands on this page run inside a Claude Code session, like every Picket command: ask Claude to run them.

## 1. Check the machine

``` sh
picket env check
```

``` text
engine: podman (Linux containers, Compose 2.40.3)
memory: 30.4 GiB · free disk: 830.2 GiB
no environment: .picket/env/compose.yaml is missing
```

The last line is expected at this point. A line that starts with `missing:` names what the machine lacks, such as `missing: no container engine: install Docker or Podman`.

## 2. See what Picket found

``` sh
picket env init
```

Picket scans the project and prints one line for each decision, with an id, a default and the other choices:

``` text
S1 src/Orders · dotnet · default write · choices write, user, shared, ignore
C1 src/Orders/appsettings.json · Services:Payments:Url = https://payments.example.com · target outside payments.example.com · variable Services__Payments__Url · default env · choices env, file, keep
H1 payments.example.com · outside host · default mock · choices mock, dependency, shared
```

Nothing is written to your project yet. The first letter of an id says what the line is about:

=== "S: a service"

    A part of your system that Picket found and can start.

    | Choice | Meaning |
    |---|---|
    | `use` | build it from the Dockerfile it already has |
    | `write` | Picket writes a Dockerfile for it, in the `docker` folder of the environment |
    | `user` | you will write the Dockerfile; the service waits until it exists |
    | `shared` | it already runs somewhere else and is never started; a variable holds its address |
    | `ignore` | leave it out |

=== "C: a config entry"

    A setting in a config file that points at an address, such as a URL or a connection string. Passwords are shown as `***`.

    | Choice | Meaning |
    |---|---|
    | `env` | set it through the environment variable the line names |
    | `file` | replace the config file with a copy, in the `config` folder of the environment |
    | `keep` | leave the value as it is |

=== "H: an outside host"

    An address outside your project that a config entry points at.

    | Choice | Meaning |
    |---|---|
    | `mock` | a stand-in service; its answers are in a file in the `mocks` folder of the environment |
    | `dependency` | a ready container image runs in its place |
    | `shared` | the real address, taken from a variable |

## 3. Create the environment

Keep every default, or name the ones you want to change:

``` sh
picket env init --create --decide "S1=user,H1=shared"
```

``` text
created 20261122-set-up-the-test-environment (setup) in the design lane
```

This does not write the environment at once. It opens a work item, "Set up the test environment", and the work runs like any other change: a plan, phases, and [gates](gates.md) where you approve. The result is the environment: `.picket/env/compose.yaml` and the folders beside it.

## 4. Prove that it starts

``` sh
picket env trial
```

Picket builds and starts the environment twice, then removes what it built:

``` text
trial passed twice; removed 2 trial image(s)
```

A failure names the step it failed in. After a passing trial, `picket env check` prints `rules passed`.

## Choose what is tested

The `testing` [setting](customization.md#settings) decides which finished items the tester checks: `design` (the default), `all` or `off`. What the tester then does is in [Review and testing](review-and-testing.md#the-test-stage).

## Keep the environment in step

When the project gains a service or a config entry, run `picket env init` again and then `picket env init --create`. It opens a work item, "Bring the test environment in step", for the new parts only. When nothing changed, it answers `the environment is in step; nothing to do`.

## Day to day

Each tested work item gets its own stack of containers.

| Command | What it does |
|---|---|
| `picket env status` | lists the stacks and each item's status |
| `picket env stop <id>` | stops an item's stack and keeps its containers and volumes |
| `picket env purge <stack>` | removes a closed item's stack: containers, networks, volumes and images |
