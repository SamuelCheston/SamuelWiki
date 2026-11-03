# API Reference

The proxy exposes four endpoints. Two serve CustomSkinLoader clients, one forwards a deletion to the upstream service, and one answers health checks. This page lists their behaviour, payloads, and errors.

## Health Check

`GET /health` returns a fixed document.

```http
GET /health HTTP/1.1
```

```json
{
  "status": "ok"
}
```

It never touches the upstream service, so it stays green even when the upstream is down.

## Player Profile

`GET /:username.json` returns the CSL profile of a player.

The path segment must end with `.json`. Without that suffix the request is answered with `404` and an empty body.

```http
GET /Player.json HTTP/1.1
```

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

- `username` is the name reported by the upstream profile
- `textures` maps a model type to a texture hash
- `default` is the standard skin, `slim` appears instead when the upstream metadata declares the slim model
- `cape` and `elytra` are present only when the player has them

The document is built from two upstream calls, `POST /api/profiles/minecraft` and `GET /sessionserver/session/minecraft/profile/{uuid}`. The details are in [Architecture](/projects/haskinproxy/architecture).

### Status Codes

- `200`: the profile was resolved
- `404`: the username could not be resolved, or the upstream returned an error

## Texture Proxy

`GET /textures/:hash` returns the raw texture bytes for a hash taken from a profile.

```http
GET /textures/1a2b3c4d5e6f HTTP/1.1
```

```http
HTTP/1.1 200 OK
Content-Type: image/png
```

The body is the image itself, not a JSON wrapper.

### Cache Behaviour

The response differs depending on whether the texture is already in the local cache.

- cache miss: the bytes are fetched from the upstream, `Content-Type` is taken from the upstream response and falls back to `image/png`, and `Last-Modified` plus `Cache-Control` are forwarded when the upstream sent them
- cache hit: the bytes come from `freecache`, `Content-Type` is `image/png`, and the response carries `X-Cache: HIT`

A cache miss never sets `X-Cache`, so the header tells you whether the texture was served locally.

### Status Codes

- `200`: the texture bytes
- `404`: the upstream returned an error, the body is empty

## Texture Deletion

`POST /:username/texture/delete` forwards a deletion to the upstream service.

```http
POST /Player/texture/delete HTTP/1.1
Authorization: Bearer <user token>
Content-Type: application/json

{
  "profile_id": "00000000000000000000000000000001",
  "texture_type": "skin",
  "remember_token": "..."
}
```

The upstream accepts fields such as `remember_token`, `profile_id`, `texture_type`, `auth_type`, `uid`, and `email`. Send the body the upstream expects; the proxy does not reshape it.

### Pass-Through Semantics

- the request body is forwarded unchanged to the upstream `POST /texture/delete`
- the caller's `Authorization` header is forwarded unchanged, and the proxy does not check it
- the upstream status code and raw response body are returned to the caller
- the `Content-Type` of the response is `application/json`

The `:username` segment is used only to identify which local cache entries to evict. On a `2xx` upstream status the proxy deletes `profile:<username>` and every `tex:<hash>` referenced by that cached profile. A failure upstream does not evict anything.

### Status Codes

- `200` or another upstream status: the upstream response, forwarded as-is
- `400`: the username is missing, or the request body could not be read
- `502`: the upstream could not be reached

## Error Format

Errors that the proxy generates itself use one shape.

```json
{
  "error": "upstream returned status 500"
}
```

- the profile endpoint answers `404` with this body when the upstream lookup fails
- the deletion endpoint answers `400` with `username required` or `cannot read body`, and `502` with the upstream error text when the upstream is unreachable
- the texture proxy answers `404` with an empty body, and the health check never fails

## Related Pages

- [Overview](/projects/haskinproxy/)
- [Architecture](/projects/haskinproxy/architecture)
- [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/): the upstream routes the proxy calls
