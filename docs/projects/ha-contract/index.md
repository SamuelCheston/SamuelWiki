# HA-Contract

HA-Contract is the contract and documentation center of the CoreMatch HA system. It holds API standards, OpenAPI definitions, development guides, external protocol references, and CI helper scripts. No service implementation code lives here.

## What It Covers

- The unified business API standard: response envelope, error codes, base path, pagination
- Machine-readable OpenAPI 3 contracts for HRPAuth, HRPAuth-Yggdrasil-API, and MatchCoreArena
- The global error code registry shared by every business API
- Development guides for HRPAuth, HRPAuth-Yggdrasil-API, HASkinProxy, and HA Services Deployer
- Read-only copies of external protocol standards such as CustomSkinAPI and authlib-injector
- CI helper scripts that check for route drift and illegal relative links

## Tech Stack

- Markdown for every document
- YAML for the OpenAPI 3.1 contracts
- Bash for the check scripts, with `rg` (ripgrep) as the only external dependency

There is no compilation step and no runtime dependency. The repository is read, edited, and checked.

## Directory Layout

```text
README.md          # project index, links to every service repository
agents.md          # mandatory rules for AI agents working in this repository
docs/              # all live documentation
docs/api/          # API standards, unified response format, error code registry
docs/api/openapi/  # machine-readable OpenAPI contracts per service
docs/dev/          # per-service development guides
docs/references/   # external protocol standards, read only
archive/docs/      # deprecated or drifted documents, not a reference
scripts/           # CI helper scripts
```

## Running It

### Prerequisites

- Bash
- `rg` (ripgrep), used by both check scripts
- the service repositories on the same machine, if you want the drift check to compare real routes

### Check Scripts

```bash
./scripts/check-business-api-drift.sh
./scripts/check-readme-links.sh
```

`check-readme-links.sh` rejects `](../` links in the READMEs of sub-directories that are published as independent repositories. Those directories no longer exist in this repository, so the script currently passes without inspecting anything.

`check-business-api-drift.sh` extracts the route list from the service sources and compares it with the path list of the OpenAPI files. It currently fails, and there are two known reasons.

- it reads `$ROOT/HRPAuth/main.go` and `$ROOT/HASkinLib/main.go`, which belonged to the old monorepo layout and were removed on 2026-11-03
- it reads `docs/api/openapi/haskinlib-business.yaml`, a file that has never existed, so the script fails on that file even after the path issue is fixed

Treat the result of this script as unreliable until both are addressed.

### Usage

Read `docs/api/README.md` first, then the OpenAPI file of the service you are working on. When you add a business route, declare it in the OpenAPI file, register the error code in `docs/api/error-codes.md`, then implement it in the service. The contract is the source of truth; the code has to match the contract, not the other way around.

## Configuration

There is no runtime configuration. The repository has nothing to start and no setting to tune.

The rules that govern it live in four places.

- `agents.md`: mandatory rules for agents, the service map, the roadmap, and the task checklist
- `docs/api/README.md`: the unified response format and the external protocol compliance list
- `docs/api/error-codes.md`: the registry every new error code must be added to
- `docs/references/README.md`: the read-only rule for external standards

The docs are written in English only. `docs/references/` must never be modified, and `archive/docs/` must never be used as a development reference.

## Relationship With Other Projects

- **Is the single source of truth** for API contracts, error codes, and specifications; every service repository README points back here
- **Defines the business API** implemented by [HRPAuth](/projects/hrpauth/), [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/), and [MatchCoreArena Server](/projects/matchcorearena-server/)
- **Will define the business API** for [HASkinLib](/projects/haskinlib/) and [HASkinProxy](/projects/haskinproxy/); both specs are still pending, and the current HASkinLib reference lives in the service repository
- **Must be checked before changing HRPAuth models**, because [HASkinLib](/projects/haskinlib/) reads the same MySQL database and a schema change breaks it
- **Is consumed by agents and by CI**, which is why the check scripts and `agents.md` are part of the repository rather than of a wiki

## Related Pages

- [Documentation Layout](/projects/ha-contract/documentation-layout): what each `docs/` subdirectory holds and which rules are hard boundaries
- [API Standards](/projects/ha-contract/api-standards): response format, error codes, auth levels, and the drift check
- [HRPAuth](/projects/hrpauth/): the service that implements the core business API
- [Content Model](/reference/content-model): how pages in this wiki are organized
