# API Reference

The service exposes three families of endpoints: the Yggdrasil protocol surface that game clients talk to, the business endpoints the WebUI SDK calls, and the internal endpoints only the core may reach. This page lists each route, its payload, and the error shape it answers with.

## Metadata

`GET /` returns the Yggdrasil metadata together with the service status.

```http
GET / HTTP/1.1
```

```json
{
  "status": "online",
  "success": true,
  "message": "HRPAuth Yggdrasil API Provider is running.",
  "site": {
    "name": "HRPAuth",
    "url": "https://auth.example.com",
    "version": "1.0.0",
    "server_time": "2026-01-01 12:00:00"
  },
  "yggdrasil": {
    "meta": {
      "serverName": "HRPAuth",
      "implementationName": "HRPAuth Yggdrasil API Provider",
      "implementationVersion": "1.0.0",
      "links": {
        "homepage": "https://auth.example.com",
        "register": "https://auth.example.com/register"
      },
      "feature.non_email_login": true,
      "feature.legacy_skin_api": true,
      "feature.no_mojang_namespace": false,
      "feature.enable_mojang_anti_features": false,
      "feature.enable_profile_key": false,
      "feature.username_check": true
    },
    "skinDomains": ["auth.example.com", ".auth.example.com"],
    "signaturePublickey": "-----BEGIN PUBLIC KEY-----\n..."
  }
}
```

The response also carries the header `X-Authlib-Injector-API-Location: /`.

- `site.url` comes from the site metadata read from the core at startup
- `links.homepage` and `links.register` are replaced by the frontend URL when the core supplied one
- `skinDomains` falls back to the site domain, both bare and dotted, when `yggdrasil.server.skin_domains` is empty
- `signaturePublickey` is the content of `yggdrasil.server.signature_public_key_path`

## Authentication

`POST /authserver/authenticate` exchanges credentials for an access token.

```http
POST /authserver/authenticate HTTP/1.1
Content-Type: application/json

{
  "username": "Player",
  "password": "...",
  "clientToken": "...",
  "requestUser": true
}
```

```json
{
  "accessToken": "...",
  "clientToken": "...",
  "availableProfiles": [
    {"id": "0123456789abcdef0123456789abcdef", "name": "Player", "model": "default"}
  ],
  "selectedProfile": {"id": "0123456789abcdef0123456789abcdef", "name": "Player", "model": "default"},
  "user": {
    "id": "...",
    "email": "player@example.com",
    "username": "Player",
    "properties": []
  }
}
```

- `clientToken` is generated when the request leaves it out
- `user` is present only when `requestUser` is `true`
- the identifier may be an email or a character name, depending on `yggdrasil.feature_flags.non_email_login`
- a login that hits the rate limit is refused with `Too many login attempts. Please try again later.`

The other four routes of the group:

- `POST /authserver/refresh` takes `accessToken`, `clientToken`, an optional `selectedProfile`, and `requestUser`. It answers a new `accessToken`, the same `clientToken`, and the selected profile.
- `POST /authserver/validate` takes `accessToken` and `clientToken`. It answers `204` when the token is valid and `403` otherwise.
- `POST /authserver/invalidate` takes `accessToken` and `clientToken`. It always answers `204`.
- `POST /authserver/signout` takes `username` and `password`. It invalidates every token of the account and answers `204`.

## Sessions

`POST /sessionserver/session/minecraft/join` opens a session for the game server.

```http
POST /sessionserver/session/minecraft/join HTTP/1.1
Content-Type: application/json

{
  "accessToken": "...",
  "selectedProfile": "0123456789abcdef0123456789abcdef",
  "serverId": "..."
}
```

The session is stored under the profile and the server, together with the client IP. The answer is `204`.

`GET /sessionserver/session/minecraft/hasJoined` is the reverse lookup. The lower case spelling `/hasjoined` works as well.

```http
GET /sessionserver/session/minecraft/hasJoined?username=Player&serverId=...&ip=... HTTP/1.1
```

```json
{
  "id": "0123456789abcdef0123456789abcdef",
  "name": "Player",
  "properties": [
    {"name": "textures", "value": "...", "signature": "..."}
  ]
}
```

- a missing `username` or `serverId` answers `400`
- an unknown profile, a missing session, or an IP mismatch answers `204`
- with `enable_ip_check` disabled, the `ip` parameter is ignored

`GET /sessionserver/session/minecraft/profile/:uuid` returns one profile by UUID.

```http
GET /sessionserver/session/minecraft/profile/0123456789abcdef0123456789abcdef?unsigned=false HTTP/1.1
```

- `unsigned` defaults to `true`, which drops the `signature` field from every property
- an unknown UUID answers `404` with `ProfileNotFoundException`

## Profile Lookup

`POST /api/profiles/minecraft` resolves several character names at once. The body is a plain array of strings and the answer is a plain array.

```http
POST /api/profiles/minecraft HTTP/1.1
Content-Type: application/json

["Player", "SomeoneElse"]
```

```json
[
  {"id": "0123456789abcdef0123456789abcdef", "name": "Player"}
]
```

Only the names that exist are returned. A body that is not an array of strings answers `400` with `IllegalArgumentException`.

## Textures

### Download

`GET /textures/:hash` returns the raw PNG file.

```http
GET /textures/1a2b3c4d5e6f... HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: image/png
```

An unknown hash answers `404` with `target_not_found`.

`GET /previews/:fileName` returns a preview. Previews are WebP, and the file name carries the type, for example `1a2b3c..._skin.webp`.

`GET /texture/avatar/:uuid` returns the head cut out of the skin as a PNG. It answers `404` when the profile has no skin.

### List

`POST /texture/get` lists the textures of every profile the token owns.

```http
POST /texture/get HTTP/1.1
Authorization: Bearer <accessToken>
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "Success",
  "data": {
    "profiles": [
      {
        "id": "0123456789abcdef0123456789abcdef",
        "name": "Player",
        "model": "default",
        "textures": {
          "skin": {"url": "https://auth.example.com/yggdrasil-api/textures/1a2b3c...", "hash": "1a2b3c..."}
        }
      }
    ]
  }
}
```

The `profiles` array also appears at the top level of the response.

### Upload

`POST /texture/upload/:uuid` takes a multipart form.

```http
POST /texture/upload/0123456789abcdef0123456789abcdef HTTP/1.1
Authorization: Bearer <accessToken>
Content-Type: multipart/form-data

file=@skin.png&type=skin&model=default
```

- `file` is the image and is required
- `type` is `skin` or `cape`, and defaults to `skin`
- `model` is `default` or `slim`, and defaults to `default`
- the answer carries the `warnings` array, which is empty when the image matches the standard proportions

### Delete

`DELETE /texture/delete/:uuid/:type` removes one texture type from a profile.

```http
DELETE /texture/delete/0123456789abcdef0123456789abcdef/skin HTTP/1.1
Authorization: Bearer <accessToken>
```

The profile must belong to the account behind the token, otherwise the answer is `403` with `profile_access_denied`.

### Legacy Skin

`GET /skin/:username` and `GET /skins/MinecraftSkins/:username` return the skin of a character as an image. Both are refused with `404` when `yggdrasil.feature_flags.legacy_skin_api` is off, and answer `204` when the character has no skin.

## Chat Signing

`POST /minecraftservices/player/certificates` issues the profile key pair used for chat signing.

```http
POST /minecraftservices/player/certificates HTTP/1.1
Authorization: Bearer <accessToken>
```

```json
{
  "keyPair": {"privateKey": "...", "publicKey": "..."},
  "publicKeySignature": "...",
  "publicKeySignatureV2": "...",
  "expiresAt": "2026-01-03T00:00:00Z",
  "refreshedAfter": "2026-01-02T16:00:00Z"
}
```

- the route answers `403` when `yggdrasil.feature_flags.enable_profile_key` is off
- a missing or invalid token answers `401`

`GET /minecraftservices/publickeys` returns the server public key in three buckets: `playerCertificateKeys`, `profilePropertyKeys`, and `authenticationKeys`.

## Business Endpoints

These endpoints take a bearer token. `GET /player` and the two Mojang bind routes accept either a core OAuth2 access token or a Yggdrasil access token. The profile routes verify the token against the core, so they need a core OAuth2 access token.

`GET /player` returns the account summary.

```http
GET /player HTTP/1.1
Authorization: Bearer <token>
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "ok",
  "data": {
    "uid": "...",
    "account_id": 1,
    "mbe": false,
    "mojang_uuid": "",
    "cbh": true
  }
}
```

`GET /player/profile` returns the game profile of the caller, or an empty `profile` when none exists yet.

`POST /player/profile` creates it. The body carries a `mode` and, depending on it, a `uuid` or a `username`.

```http
POST /player/profile HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "mode": "mojang",
  "username": "PremiumName"
}
```

- `random` generates a UUID
- `custom` uses the supplied `uuid`
- `mojang` looks the UUID up from the Mojang username
- a second call answers `409` with `profile_already_exists`

`POST /player/mojang-bind-enable` and `POST /player/mojang-bind-disable` turn the Mojang bind flow on and off. Enabling it starts a 15 minute countdown that clears the flag again if the binding never happens.

Two routes proxy the Mojang sessionserver:

- `GET /mojang/profile/:uuid` answers `id`, `name`, and `has_cape`
- `GET /texture/mojang/:uuid?type=skin` answers `302` to `textures.minecraft.net`; `type` accepts `skin` and `cape`

## Internal Endpoints

These two routes require the internal key in the `X-Internal-Key` header. Without it they answer `401`.

`GET /internal/heartbeat` answers `I am alive`.

`POST /internal/proxy-register` creates a game account that has no core user behind it. The body carries a `username`, a `password`, and a `mojang_uuid`.

```http
POST /internal/proxy-register HTTP/1.1
X-Internal-Key: ...
Content-Type: application/json

{
  "username": "ProxyUser",
  "password": "...",
  "mojang_uuid": "0123456789abcdef0123456789abcdef"
}
```

```json
{
  "success": true,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "Proxy account registered",
  "data": {"account_id": 2, "profile_id": "fedcba9876543210fedcba9876543210"},
  "account_id": 2,
  "profile_id": "fedcba9876543210fedcba9876543210"
}
```

Registering the same `mojang_uuid` again returns the existing account instead of creating a second one. When the username collides with an account whose Mojang bind window is open (`mbe=1`), the request completes that bind flow instead of creating a new account: it sets the `mojang_uuid`, resets `mbe`, and keeps the existing account's identity.

`POST /register` is the business counterpart of this route. It takes an `identifier`, a `password`, and an optional `mojang_uuid`, verifies the credentials against the core, and creates the account and the default profile in one transaction.

## Admin Endpoints

Two routes operate on proxy-registered accounts. Both require an OAuth2 service token Bearer with a dedicated scope, and both are called by the [HRPAuth Spigot](/projects/hrpauth-spigot/) plugin through the core's `/yggdrasil-api` relay.

`POST /admin/claim-user` claims a proxy-registered game account (`cbh=0`) for the player. The body carries the game profile `username`, an `email`, and a `password`; the service provisions the core user through the core's `POST /internal/claim-user`, links it to the game account, and sets `cbh=1`. Requires the `user.claim.as-service` scope. Specific errors: `user_not_found` (404), `user_not_claimable` / `email_already_registered` / `username_already_bound` (409).

`POST /admin/force-bind` transfers the `mojang_uuid` from a proxy-registered account (matched by profile name) to the account identified by the target `email` + `password`, verified against the core, then deletes the proxy account. Requires the `user.force-bind.as-service` scope; the historical `manage_token` body field is retired and no longer accepted. Specific errors: `no_mojang_uuid` (400), `invalid_credentials` (403), `user_not_found` (404), `mojang_uuid_already_bound` (409).

## Error Responses

The service answers with three different error shapes.

Protocol endpoints use the Yggdrasil shape.

```json
{
  "error": "ForbiddenOperationException",
  "errorMessage": "Invalid credentials.",
  "cause": null
}
```

Business endpoints use the shared envelope.

```json
{
  "success": false,
  "meta": {"request_id": "8f14e45fceea167a"},
  "message": "invalid or missing bearer token",
  "code": "invalid_credentials",
  "error": "invalid_credentials"
}
```

`code` carries a machine readable slug, and `error` repeats it for callers that read that field. When a business endpoint succeeds, the keys of `data` are also copied to the top level of the document.

An unknown route answers with the protocol shape and a `404`.

```json
{
  "error": "Not Found",
  "errorMessage": "The requested endpoint does not exist.",
  "cause": null
}
```

The chat signing routes use their own shape when the token is missing or invalid.

```json
{
  "path": "/minecraftservices/player/certificates",
  "errorType": "Unauthorized",
  "error": "Unauthorized",
  "errorMessage": "Unauthorized"
}
```

Every response carries the `X-Request-Id` header, and the same value appears in `meta.request_id`.

## Related Pages

- [Overview](/projects/hrpauth-yggdrasil-api/)
- [Architecture](/projects/hrpauth-yggdrasil-api/architecture)
- [API Standards](/projects/ha-contract/api-standards): the contract the business endpoints follow
