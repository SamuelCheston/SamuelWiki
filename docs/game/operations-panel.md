# Operations Panel

HA Services MaintenanceView is the browser-based panel for the stack: it shows what the Deployer knows, and it can trigger deployments and rollbacks. Everything it shows comes from the projects' manifests; nothing is invented in the browser.

## What You Can See

- **Project list** — exactly the aggregated `deploy-manifest.yaml` declarations the Deployer scanned. Manifest load errors surface verbatim as a warning banner instead of being hidden.
- **Validation** — the aggregate validation report, including duplicate-project warnings with the duplicate paths.
- **Status** — declared state versus live state per project: installed version, `current` target, process health, reachability.
- **Run records** — every deploy and rollback run with per-project, per-step progress and outcomes (deployed, up-to-date, rolled-back, failed, dry-run, foreign, skipped), plus the preflight report that gated the run.

## What You Can Do

- **Deploy** and **rollback** (including dry runs) from the orchestration area; the panel forwards the request to the Deployer, which runs the preflight gate and executes the run. See [Deployment Orchestration](/game/deployment) for what a run does.
- **First-configuration bootstrap** for a small set of known services: run the downloaded binary once to generate its default config, then rewrite the listen address and cross-service URLs.

## Availability Comes From The Manifest

Which projects get deploy buttons is decided purely by manifest declarations (`frontend/src/api.ts::isDeployable`): a project is deployable when its manifest declares the Tinyvisor process manager and its kind is not external. Panel-managed, manually managed, and external entries stay visible as read-only facts. No manifest declarations means an empty orchestration area — the panel has no client-side fallback list.

## Login And Credentials

- The panel reuses the existing operations identity: the login password **is** the Deployer deploy token (`internal/server/auth.go::authEnabled`). There is no separate account system.
- Deploy credentials stay server-side. The panel backend injects the token into outbound mutation requests (`internal/deployer/client.go`); no endpoint ever returns token material, and the configuration endpoint is redacted.
- When no token is configured, the panel keeps working in login-free mode — announced, not silent: the header shows a warning badge, read-only views work, and deploy/rollback answer 503 (fail-closed), matching the Deployer's own behavior.

## Related

- [Deployment Orchestration](/game/deployment): what runs and rollbacks actually do
- [HA Services MaintenanceView](/projects/ha-services-maintenanceview/): project page with configuration keys and API skeleton
- [HA Services Deployer](/projects/ha-services-deployer/): the backend this panel proxies
