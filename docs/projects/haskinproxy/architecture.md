# Architecture

HASkinProxy is a stateless translation layer with one local cache and one upstream dependency. This page walks a request through the proxy and explains how the service attaches itself to HRPAuth.

## Profile Translation Chain

A CSL client asks for `Player.json`. The proxy turns that into two upstream calls and one JSON document.

```text
GET /Player.json
  -> cache lookup: profile:Player
  -> POST {upstream}/yggdrasil-api/api/profiles/minecraft   body ["Player"]
  -> GET  {upstream}/yggdrasil-api/sessionserver/session/minecraft/profile/{uuid}
  -> decode the base64 "textures" property
  -> pick the SKIN / CAPE / ELYTRA urls
  -> keep the last path segment of each url as the texture hash
  -> rebuild the CSL texture map
  -> cache and answer
```

### The texture map

The upstream `textures` property is a base64 string that decodes into a JSON document. The proxy reads three entries from it.

- `SKIN`: the hash is stored under the model type, `default` when the upstream metadata carries no `model` key, otherwise the metadata value such as `slim`
- `CAPE`: stored under `cape`
- `ELYTRA`: stored under `elytra`

The result is a flat map from model type to hash, which is the shape the CSL protocol expects.

```json
{
  "username": "Player",
  "textures": {
    "default": "1a2b3c4d5e6f",
    "cape": "7f8e9d0c1b2a",
    "elytra": "3c4d5e6f7a8b"
  }
}
```

A missing texture is simply absent from the map. A property that fails to decode is skipped, and the rest of the response is still returned.

## Cache Layer

The cache is a single `freecache` instance living in the process. It holds two kinds of entry under two key prefixes.

- `profile:<username>`: the translated CSL document, stored as JSON, TTL from `cache.profile_ttl`
- `tex:<hash>`: the raw texture bytes, stored untouched, TTL from `cache.texture_ttl`

The size limit comes from `cache.max_size_mb` and defaults to 256 MB. When the limit is reached, `freecache` evicts on its own; the proxy never manages capacity itself.

The two entry types have different lifetimes on purpose. A profile changes when a player changes skin, a texture file does not.

### Eviction

The only explicit eviction happens after a successful texture deletion.

- the `profile:<username>` entry is dropped
- every `tex:<hash>` entry referenced by that cached profile is dropped as well

When the profile was not cached, no texture hash is known, so only the profile entry is removed and the texture entries are left to expire by TTL.

## Upstream Integration

The proxy talks to two different prefixes of the same upstream service.

- `{upstream.base_url}/yggdrasil-api` for Yggdrasil traffic: profile lookup, session profile, texture bytes, texture deletion
- `{upstream.base_url}` for the HRPAuth microservice extension layer

Three calls make up the HRPAuth integration, all of them started at boot and all of them non-blocking.

### Presence

`POST /services/presence` registers the proxy in the HRPAuth presence registry. The request declares the service name, the self-declared lifetime from `presence.ttl_seconds`, and a scope that covers the `webui-dash` frontend area.

### Relay

`POST /services/relay` publishes a single rule: the destination `/csl` on the main service origin is forwarded to `server.public_url`. The main service strips the prefix, so `/csl/Player.json` reaches the proxy as `/Player.json`.

`server.public_url` must therefore be an address HRPAuth can reach. When it is empty, no relay rule is registered.

### SDK package

`POST /services/sdk-packages` uploads the compile-time SDK package as `multipart/form-data`. A package with the same name that already exists returns `409`; the proxy deletes the stale one and uploads again, so every restart converges the remote package to the embedded sources.

Every failure in this group is logged as a warning. None of them stops the proxy or prevents the HTTP server from starting.

## Compile-Time SDK Package

The `sdk/` tree is embedded into the binary with `embed.FS`, so no extra files need to ship next to the executable.

- `sdk/manifest.json` describes the package: the name, the version, the route `/customskinloader`, the module `src/pages/CSLSetup`, and the menu and dashboard entries
- `sdk/src/pages/CSLSetup.tsx` is the React page that generates a CustomSkinAPI `config.json` and explains how to install it

At boot the tree is packed into an in-memory `tar.gz` with `manifest.json` at the archive root and uploaded to HRPAuth. The [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/) then aggregates the package into the Web UI build.

`GET /customskinloader` is no longer a runtime route of the proxy. The page is now served by the Web UI itself.

## Authentication Boundary

The proxy does not authenticate its own callers.

- Read endpoints are open. A CSL client has no credential to present, so profile lookups and texture downloads are served anonymously.
- The texture deletion endpoint forwards the caller's `Authorization` header to the upstream unchanged, together with the request body. The upstream decides whether the credential is valid.
- The proxy authenticates itself towards the upstream with an OAuth2 service token, obtained through the `client_credentials` grant at `{upstream.base_url}/oauth/token`. The token is only used when the request carries no `Authorization` header of its own, and it is reused until it expires.
- The upstream request timeout comes from `upstream.timeout`.

Because the deletion endpoint is a pass-through, an unauthenticated caller reaches the upstream deletion route without any check at the proxy. If you expose the proxy directly, put your own access control in front of it.

## Route Assembly

Routes are registered in `internal/router`, and the order matters.

- `/health` and `/textures/:hash` are registered before the `/:username` wildcard, so the static routes win
- `/:username` handles the profile request and expects the path segment to end with `.json`, otherwise it answers `404`

## Related Pages

- [Overview](/projects/haskinproxy/)
- [API Reference](/projects/haskinproxy/api)
- [HRPAuth Architecture](/projects/hrpauth/architecture): the microservice extension layer on the upstream side
