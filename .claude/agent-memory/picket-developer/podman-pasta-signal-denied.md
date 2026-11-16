---
name: podman-pasta-signal-denied
description: Rootless Podman stop/down can fail ("rootless netns: kill network process: permission denied") when the host's AppArmor pasta profile refuses SIGTERM from podman; fixed on the development machine since 2026-11-15
metadata:
  type: project
---

On 2026-11-14 containers started, but every `compose stop`/`down` and `podman run --rm --network` cleanup failed: the kernel audit showed `apparmor="DENIED" operation="signal" profile="pasta" ... signal=term peer="podman"`. The machine's owner changed the host configuration, and since 2026-11-15 `node scripts/test.mjs env` passes 3 of 3 there, T-5.6 included.

**Why:** host configuration, not Picket code (D-004 of 20261114-env-verbs-pass-on-real-engine). Never claim the real-engine tests cannot run without running them first.

**How to apply:** if `env stop` fails on a host, check `journalctl -k | grep 'profile="pasta"'` for fresh denials and report it to the lead; the fix is the owner's. A failed run leaves `picket-trial` / `picket-envtest-*` containers, networks and volumes that block T-3.3: remove them one by one per stack or ask the lead. See [[drive-needs-fresh-dist]].
