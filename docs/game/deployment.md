# Deployment Orchestration

HA Services Deployer is the deployment executor for the stack. Each project declares itself in a manifest; the Deployer verifies artifacts, switches versions, restarts processes through Tinyvisor, probes health, and rolls back. This page covers the manifest model, both runtimes, and the safety semantics.

## The Manifest Model

Every project carries a `deploy-manifest.yaml` at its repository root. The manifest is split into two layers:

- **Runtime-independent facts** — what the project is: ports and their exposure, health probe, optional post-deploy smoke assertions, dependencies, data directories, config files. Both runtimes consume the same facts.
- **Runtime execution** — how the project runs: a `baremetal` section and a `container` section. A top-level `runtime` selector picks one per project (default `baremetal`); a deployment-context override (`orchestration.overrides.<project>.runtime` in the Deployer configuration) can switch it without editing the manifest. Any other value is rejected at validation.

The Deployer scans configured roots for manifests, aggregates them, and validates the aggregate. Duplicate project names (for example a parallel worktree copy) do not block by default: they are reported as warnings with every duplicate path listed, and the first match in scan-root order wins. A configuration switch (`orchestration.strict_project_names`) escalates duplicates to a hard refusal when strictness is wanted.

## Bare-Metal Runtime

The bare-metal flow (`internal/orchestrator/pipeline.go`):

1. The artifact is staged and verified (SHA-256 is mandatory).
2. It is installed into a version directory under the project's `releases/` tree.
3. The `current` symlink is switched atomically (temporary link plus rename, `internal/orchestrator/pipeline.go::switchSymlink`).
4. The startup script registered with Tinyvisor runs `./current/<binary>`, so the symlink switch plus a restart is what makes a version live. Data directories declared as shared live outside the version directory and survive upgrades untouched.
5. The Deployer restarts the session through Tinyvisor, waits for the health probe, and — when the manifest declares smoke assertions — runs real requests against them. A failed smoke is a failed deployment and triggers the same automatic rollback.

Semantics worth knowing:

- **Effect = symlink switch + restart + healthy.** Moving files alone is not a deployment.
- **Idempotent re-run = resume.** A run records per-project progress; re-running picks up where it stopped, and already-healthy targets report up-to-date.
- **Failure isolation**: projects are deployed in dependency topological order; one project failing does not corrupt the others, and runs are recorded for inspection.
- **Processes belong to Tinyvisor.** The Deployer is not a daemon manager: it writes no systemd units and holds no processes.

## Container Runtime

With `runtime: container`, the image is the version (`<project>:<service_version>`); switching versions recreates the same-named container, and supervision comes from the container restart policy. Container projects never touch Tinyvisor. Health probes and smoke assertions run against the published host ports with unchanged semantics. Orphaned containers carrying the orchestrator's label but no longer present in any manifest are **reported, not removed**, unless the orphan policy is explicitly set to remove.

## Rollback Semantics

- **Bare metal**: rollback switches `current` back to the previous version directory and restarts.
- **Container**: rollback is pinned to the **image digest** recorded in the run record, never to the tag. Tags are movable references — retagging would silently roll onto different content. If the recorded digest's image no longer exists, rollback refuses explicitly; there is no fall-back-to-tag and no nearest-match substitution. Recovery is redeploying that version so a fresh digest is recorded.

## Preflight

Every run and rollback starts with a single-pass preflight check (`internal/orchestrator/preflight.go`): install root and symlink writability, env files, resolvable secrets, Tinyvisor reachability and key validity, port occupancy (the project's own process is skipped), disk space, and dependency reachability. Blockers refuse the run with the full graded report; warnings pass through. Every item carries its concrete path or port. Dry runs go through the same gate and record the report together with the planned steps.

## Authentication And Credentials

- **Fail-closed deploy endpoints**: mutation endpoints require the `X-Deploy-Token` header. When no token is configured they answer 503 — they never fall back to unauthenticated. Read-only endpoints stay open.
- **Manifests never contain credentials.** The loader scans the whole manifest structure (`internal/manifest/manifest.go::scanCredentials`) and refuses to load it when a credential-looking key carries a literal value, when any value looks like a secret material, or when a placeholder is not a whole-value `${secret:<name>}` reference. Referenced secrets resolve at runtime from a local credentials file (mode 0600, never committed).
- The operations panel forwards the token server-side; browsers never see it. See [Operations Panel](/game/operations-panel).

## Artifacts

Artifact source is currently `local_path` with mandatory SHA-256 verification; the `ci_release` source is implemented but not enabled. When releases are enabled, assets follow a fixed naming convention: `<project>-linux-amd64` plus a matching `.sha256` file. The authoritative statements live in the Deployer `README.md` and `knowledge/`.

## Boundaries

- Projects whose manifest declares a panel or manual process manager are foreign: the orchestrator lists them read-only and never touches them.
- Deployment boundaries and scope decisions: Deployer `knowledge/0007-bare-metal-orchestration-scope.md` and `knowledge/0011-container-orchestration-minimal-loop.md`.

## Related

- [Operations Panel](/game/operations-panel): the browser front end for runs, rollbacks, and status
- [HA Services Deployer](/projects/ha-services-deployer/): project page, configuration, and API skeleton
- [Container Orchestration](/projects/ha-services-deployer/container-orchestration): the Compose template for the auth stack (a separate mechanism from the container runtime above)
