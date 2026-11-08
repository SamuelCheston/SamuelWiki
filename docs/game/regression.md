# Regression Script

One command stands up a complete real environment — real game client, real servers — and runs the mod-assembly chain end to end, including its failure-sensitive assertions. The script lives in the RW-Mod-Injector repository at `scripts/regress-e2e.sh`.

```bash
bash scripts/regress-e2e.sh
```

## What It Stands Up

- The **real game client** with the injector installed into it
- **Two real Avalon instances** built from a local checkout: one zero-mod lobby and one modded room
- A **real Cascade** proxy with a fresh configuration and a fresh signing key

Everything runs in a temporary directory. The Avalon and Cascade checkouts are used read-only (built, never modified), and no existing instance or configuration is touched. The client's original state (mods directory, preferences, injector files) is backed up first and always restored at the end, even when the run fails or the environment is kept for inspection.

## What It Verifies

1. **Environment boot with real gating**: both Avalon instances healthy (helper included) and both backends judged healthy by Cascade before any client connects — the exact gating that avoids the "rooms visible but backend not healthy" window.
2. **The main chain**: connect to the lobby → fetch manifest → download → hash verification → materialization → leave room → hot reload → reconnect → `/goto` → the player present in the modded room.
3. **Automatic restore** after a configurable delay, then the snapshot assertions: newly installed mods disabled, snapshot keys cleared, no ghost players left in the lobby, and the player back where they belong after the restore.
4. **Zero false positives**: failure messages that must only ever appear on real failures (not connected to a lobby, reload failure, unexpected failure) are asserted absent from a normal run.

## Pass, Fail, And Debugging

- Exit code `0` means every check passed; `1` means a check failed or a prerequisite is missing. Missing prerequisites abort with an explicit statement of what is missing — nothing is skipped silently.
- Ports, directories, and binaries are overridable through `RWMI_*` environment variables so the run cannot collide with other sessions on the same machine.
- `RWMI_KEEP=1` keeps the temporary environment for inspection (client state is still restored); the summary points at the client log and per-instance logs.

## Related

- [Mod Assembly](/game/mod-assembly): the chain this script exercises
- [Zero-Mod Lobby and Routing](/game/lobby-and-routing): the topology it builds
- RW-Mod-Injector `knowledge/0002-failure-messaging.md`: the failure messages asserted here, with their trigger conditions
