# API Standards

Every HA business API answers with the same envelope, reports failures with a registered error code, and declares its authentication level. This page describes those rules and how you check them.

## The Rule of Direction

The OpenAPI file defines the contract, and the code has to match it. When the two disagree, the code is what changes.

This applies to every service in the ecosystem, not only to the ones that have an OpenAPI file yet.

## Unified Response Format

### Success

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "..."
  },
  "meta": {
    "request_id": "ab12cd34"
  }
}
```

- `success` is `true`
- `data` carries the payload
- `meta.request_id` is present on every response and is what you quote when you trace a request

During the transition period some success fields are mirrored at the top level so old frontends keep working. New callers should always read from `data`.

### Error

```json
{
  "success": false,
  "message": "Invalid email",
  "code": "invalid_email",
  "error": "invalid_email",
  "meta": {
    "request_id": "ab12cd34"
  }
}
```

- `code` is the standard error field
- `error` is a compatibility alias whose value matches `code`, kept so existing callers do not break
- `data` is absent on failures

The base path of a business API is `/`, and it is declared as such in the `servers` block of each OpenAPI file.

## Pagination

List endpoints take `page_num` and `page_size` as query parameters. `page_num` starts at `1`, and `page_size` defaults to `20` with a maximum of `100`. At the moment this convention is only declared in the MatchCoreArena contract.

## Error Codes

Error codes are stable `lower_snake_case` strings. The registry lives in `docs/api/error-codes.md` and currently holds 96 entries, from `invalid_json_body` at the parsing level to the `mca_` prefixed MatchCoreArena codes.

The order of work when you add one is fixed.

1. register the code in `docs/api/error-codes.md`
2. declare it in the OpenAPI spec of the service
3. implement it in the service

A code that is not in the registry is not a contract, even if the service already returns it.

## Authentication Levels

Three credential levels are defined across the HA business APIs.

| Level | Meaning | Accepted credentials |
|---|---|---|
| `0` | None | No credentials required |
| `1` | User | OAuth2 user Bearer token |
| `2` | Ops | Manage Token (M-T) or an OAuth2 service token (`client_credentials` / `.as-service` scope) |

The resolution order is fixed.

- no `Authorization: Bearer` header: level `0`
- the token equals the Manage Token: level `2`
- the token resolves as an OAuth2 token: level `2` for a service token, level `1` otherwise
- the token does not resolve: level `0`

When several services take part in one request, the required level is the maximum of their `security_level`, computed at request time. The strictest service wins.

Failures are reported by level, not by a generic unauthorized.

- no credential at all: `401 oauth_login_required`
- a credential that is present but too weak: `403 insufficient_auth_level`

When you add an endpoint, declare the level it needs and document it in the OpenAPI spec.

## OpenAPI Contracts

| File | Service | Scope |
|---|---|---|
| `docs/api/openapi/hrpauth-business.yaml` | HRPAuth | Core business API: OAuth2, account, TOTP, WebAuthn, textures, SDK package management |
| `docs/api/openapi/hrpauth-yggdrasil-business.yaml` | HRPAuth-Yggdrasil-API | Business wrappers around the Yggdrasil protocol: textures, game accounts, Mojang proxy |
| `docs/api/openapi/matchcorearena-business.yaml` | MatchCoreArena | Arena business API: auth, friends, teams, matches, rankings |

All three are OpenAPI 3.1.

Two services are still missing a contract. HASkinLib and HASkinProxy have no OpenAPI file in `docs/api/openapi/`, so their current API reference stays in the service repositories.

The Yggdrasil protocol surface is not part of `hrpauth-business.yaml`. That file covers the HRPAuth core business endpoints only; the protocol surface is described in `docs/dev/HRPAuth/yggdrasil-api.md`.

## Running the Drift Check

Before you submit a change that touches business routes, run the check.

```bash
./scripts/check-business-api-drift.sh
```

It extracts the route list from the service sources, normalizes the path parameters, and reports every route that is missing from the OpenAPI path list.

The script needs `rg` (ripgrep) and Bash.

You also need to know that it does not currently run to completion. Two things stand in its way.

- it reads `$ROOT/HRPAuth/main.go` and `$ROOT/HASkinLib/main.go`, which belonged to the old monorepo layout and were removed on 2026-11-03
- it reads `docs/api/openapi/haskinlib-business.yaml`, which has never existed, so the script fails on that file

Treat the result as unreliable until both are fixed.

The second script has a different job and does pass.

```bash
./scripts/check-readme-links.sh
```

It rejects `](../` relative links in the READMEs of sub-directories that are published as independent repositories. Those directories no longer exist here, so it currently finds nothing to check.

## Related Pages

- [Overview](/projects/ha-contract/)
- [Documentation Layout](/projects/ha-contract/documentation-layout)
- [HRPAuth](/projects/hrpauth/): the service whose business routes follow this contract
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the wrappers described by the second OpenAPI file
