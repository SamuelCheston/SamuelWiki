# Documentation Layout

HA-Contract keeps four kinds of documents apart, and the separation is enforced by rules rather than by convention. This page explains what belongs in each directory and which boundaries you must not cross.

## Two Document Homes

Documentation for the HA system lives in two independent places.

- `HA-Contract/docs/`: the authoritative contract source, and the place AI agents are expected to read
- `CoreMatch/HRPAuth-Wiki`: a separate content repository for human developers

Contract work belongs in `HA-Contract`. Do not modify the wiki repository as part of contract work.

## `docs/api/`

The API standard itself. It answers the question "what shape must a business response have".

- `README.md`: the unified response format, the external protocol compliance list, and the file index
- `error-codes.md`: the global error code registry

`README.md` also draws the line between the two kinds of documentation: `docs/api/` and `docs/dev/` describe how the project implements these interfaces, while `docs/references/` holds the protocol standards themselves.

## `docs/api/openapi/`

The machine-readable contracts. Each file describes the paths and response structures of one service.

- `hrpauth-business.yaml`: HRPAuth core business API
- `hrpauth-yggdrasil-business.yaml`: HRPAuth-Yggdrasil-API business wrappers
- `matchcorearena-business.yaml`: MatchCoreArena server business API

Two services are not covered yet. HASkinLib and HASkinProxy have no OpenAPI file in this directory, and their current API reference lives in the service repositories.

The Yggdrasil protocol surface is deliberately not in `hrpauth-business.yaml`. It is documented separately in `docs/dev/HRPAuth/yggdrasil-api.md`, and only the business wrappers around it are in the OpenAPI file.

## `docs/dev/`

Development guides for the individual services. They explain implementation detail: configuration, data models, migrations, tokens, feature flags, and integration contracts.

- `HRPAuth/`: configuration, data models, database migrations, token system, feature flags, microservices extension layer, SDK package contract, profile keys, legacy skin API, BS2HA migration
- `HRPAuth-Yggdrasil-API/`: the interaction contract of the standalone Yggdrasil service
- `HASkinProxy/`: how the Yggdrasil-to-CSL translation proxy works
- `HA-Services-Deployer/`: the version manifest format

## `docs/references/`

External protocol standards, and the only read-only content in the repository.

- `CustomSkinAPI.md`: the skin library standard
- `authlib-injectorwiki.pdf`: the authlib-injector and Yggdrasil API protocol reference

These files are the authoritative definitions of protocols owned by other projects. The compliance principle is one-directional: the implementation must follow them, and the documents themselves are never modified to fit the implementation.

## `archive/docs/`

Deprecated and drifted documents, kept for history only.

- `HRPAuth/`: the old endpoint-by-endpoint documentation, the old configuration and data model notes
- `HASkinLib/`: the old skin library API notes
- `WinnerProxy/`: the old root README

Two things to know about this directory. It is not a development reference, and its content has drifted from the current implementation. Some of the archived documents are also written in Chinese, which the current English-only rule does not cover.

## `agents.md`

The rules for AI agents working in this repository, and the file every agent is expected to read first.

- the service map: repository, purpose, and tech stack of every service in the ecosystem
- the mandatory rules: single source of truth, read-only references, the archive ban, English-only docs, the drift check
- the sub-project coupling notes, including the shared MySQL database between HRPAuth and HASkinLib
- a roadmap table, which agents may extend only after asking the owner
- the task checklist every agent must work through

The file also points at a second, human-facing documentation repository, so an agent knows which one it is allowed to edit.

## `scripts/`

Two CI helpers, and the gate they form.

- `check-business-api-drift.sh`: compares the routes extracted from the service sources against the paths declared in the OpenAPI files, so a route that was added in code but never documented is caught
- `check-readme-links.sh`: rejects `](../` relative links in the READMEs of sub-directories that are published as independent repositories, because a relative link breaks once the directory is split out

Both scripts need `rg`. The drift script currently fails for the reasons described on the [overview](/projects/ha-contract/) page: it still points at the removed monorepo layout and at an OpenAPI file that does not exist.

## Where a Change Goes

- a new business route: the OpenAPI file of that service
- a new error code: `docs/api/error-codes.md`, before the code is implemented
- a change in service behaviour: the matching `docs/dev/` guide
- a protocol question: `docs/references/`, read only
- a rule that applies to every agent: `agents.md`

## Related Pages

- [Overview](/projects/ha-contract/)
- [API Standards](/projects/ha-contract/api-standards)
- [Writing Conventions](/reference/writing-docs): the conventions this wiki follows
