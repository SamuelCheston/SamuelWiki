# API

HASkinLib exposes eight routes and no `/api` prefix. Two of them serve files and are public. The rest expect an OAuth2 bearer token issued by HRPAuth, except the two probes.

## Route List

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/texture/upload` | Bearer | Upload a PNG skin or cape and generate its preview |
| `GET` | `/texture/listpreview` | none | Paginated preview metadata |
| `GET` | `/texture/preview/:preview_file` | none | Serve the WebP preview file |
| `GET` | `/texture/pull/:hash` | none | Serve the original PNG file |
| `POST` | `/texture/delete` | Bearer | Delete one of your own textures |
| `GET` | `/profile/textures` | Bearer | Your own texture list, currently shelved |
| `GET` | `/example` | none | Liveness check |
| `GET` | `/health` | none | Health probe |

## Response Envelope

Every JSON answer uses the same envelope.

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture uploaded successfully",
  "data": {}
}
```

A failure replaces `success` with `false` and adds the code twice.

```json
{
  "success": false,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "file is required",
  "code": "texture_file_required",
  "error": "texture_file_required"
}
```

The request ID is taken from the `X-Request-Id` header when you send one, and it is echoed back in the same header.

## Authentication

Protected routes read the token from the header.

```http
Authorization: Bearer <access_token>
```

The token is verified against the HRPAuth core API. The old `remember_token` and `rt` form fields were removed and are not accepted any more.

## Upload

`POST /texture/upload` takes `multipart/form-data`.

- `type`: required, `skin` or `cape`
- `model`: optional, `default` or `slim`, only used by skins, defaults to `default`
- `name`: required
- `description`: optional
- `tags`: optional, several tags separated by a comma, a Chinese comma, a semicolon, a pipe, a tab, or a newline
- `file`: the PNG file, `texture` works as an alternative field name

### Size Rules

- A skin must be `64x32` or `64x64`.
- A cape must be `64x32` or `22x17`.
- A `22x17` cape is placed on a transparent `64x32` canvas on the server, and the stored file is the normalized one.
- The name is truncated to 20 characters.
- The file has to be a valid PNG. The decoded pixels are re-encoded before they are stored, so the stored bytes are not the uploaded bytes.

### Limits

- `textures.max_upload_bytes`, default `2` MiB, applies to the file itself.
- `textures.max_request_bytes`, default `2` MiB plus 256 KiB, applies to the whole request.

### Response

A new record returns `201 Created`.

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture uploaded successfully",
  "data": {
    "id": 12,
    "hash": "8c9b0f...",
    "type": "skin",
    "uid": 10001,
    "model": "slim",
    "width": 64,
    "height": 64,
    "file_name": "my-skin.png",
    "preview_file": "8c9b0f..._skin.webp",
    "name": "Blue Girl",
    "description": "demo skin",
    "tags": "展示,蓝色",
    "created_at": "2026-08-02 12:00:00",
    "updated_at": "2026-08-02 12:00:00"
  }
}
```

Uploading the same file again as the same user updates the metadata and returns `200 OK` with the message `texture metadata updated successfully`. A cape answer has no `model` field.

```bash
curl -X POST "http://127.0.0.1:2701/texture/upload" \
  -H "Authorization: Bearer <access_token>" \
  -F "type=skin" \
  -F "model=slim" \
  -F "name=Blue Girl" \
  -F "description=demo skin" \
  -F "tags=展示,蓝色" \
  -F "file=@skin.png"
```

## Preview List

`GET /texture/listpreview` returns metadata only, never image bytes.

- `type`: optional, `all`, `default`, `slim`, or `cape`, defaults to `all`
- `order`: optional, `asc` or `desc`, defaults to `desc`
- `tag`: optional, filters by tag
- `page`: optional, a positive integer, defaults to `1`

The page size is fixed at 16. `type=all` covers skins only, capes are excluded.

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture preview list retrieved successfully",
  "data": {
    "items": [
      {
        "id": 12,
        "hash": "8c9b0f...",
        "type": "skin",
        "model": "slim",
        "uid": 10001,
        "width": 64,
        "height": 64,
        "file_name": "my-skin.png",
        "preview_file": "8c9b0f..._skin.webp",
        "name": "Blue Girl",
        "description": "demo skin",
        "tags": "展示,蓝色",
        "created_at": "2026-08-02 12:00:00",
        "updated_at": "2026-08-02 12:00:00"
      }
    ],
    "filter": "all",
    "order": "desc",
    "tag": "",
    "page": 1,
    "page_size": 16,
    "total": 28,
    "has_more": true
  }
}
```

The fields of `data` are repeated at the top level of the envelope, so `items` and the pagination fields are readable without digging into `data`.

```bash
curl "http://127.0.0.1:2701/texture/listpreview?type=slim&order=asc&page=2"
```

## Preview And Pull

Both routes are public.

`GET /texture/preview/:preview_file` takes a `.webp` file name such as `8c9b0f..._skin.webp` and answers with `Content-Type: image/webp`.

`GET /texture/pull/:hash` takes the 64 character SHA-256 of the file and answers with `Content-Type: image/png`.

Both send `Cache-Control: public, max-age=86400`.

```bash
curl "http://127.0.0.1:2701/texture/preview/8c9b0f..._skin.webp" --output preview.webp
curl "http://127.0.0.1:2701/texture/pull/8c9b0f..." --output texture.png
```

## Delete

`POST /texture/delete` takes `multipart/form-data` with `type` and `hash`. It only deletes a record that belongs to the caller, and there is no way to name another user.

```json
{
  "success": true,
  "meta": { "request_id": "1f3c9a0b6d2e4f10" },
  "message": "texture deleted successfully",
  "data": {
    "id": 12,
    "hash": "8c9b0f...",
    "type": "skin",
    "uid": 10001,
    "model": "slim",
    "name": "Blue Girl",
    "file_name": "my-skin.png",
    "preview_file": "8c9b0f..._skin.webp"
  }
}
```

```bash
curl -X POST "http://127.0.0.1:2701/texture/delete" \
  -H "Authorization: Bearer <access_token>" \
  -F "type=skin" \
  -F "hash=8c9b0f..."
```

## Profile Textures

`GET /profile/textures` returns the textures of the caller, with an optional `type` of `all`, `skin`, or `cape`.

The endpoint is implemented but currently shelved, so treat it as unavailable.

## Error Codes

| Code | HTTP | Meaning |
|---|---|---|
| `invalid_request` | `400` | A parameter is missing or malformed |
| `invalid_texture_type` | `400` | The type must be `skin` or `cape` |
| `invalid_texture_model` | `400` | The model must be `default` or `slim` |
| `texture_file_required` | `400` | Neither `file` nor `texture` was sent |
| `invalid_texture_file` | `400` | The file is not a valid PNG |
| `invalid_texture_size` | `400` | The dimensions do not match the size rule |
| `texture_name_required` | `400` | The name is empty |
| `oauth_login_required` | `401` | No bearer token was sent |
| `oauth_invalid_grant` | `401` | The token is invalid, expired, or revoked |
| `texture_not_found` | `404` | No record for this user and hash |
| `preview_not_found` | `404` | The preview file is not on disk |
| `upload_request_too_large` | `413` | The request or the file is above the limit |
| `upload_rate_limited` | `429` | The upload limiter rejected the request |
| `storage_not_configured` | `500` | The storage directory is empty in the configuration |
| `texture_upload_failed` | `500` | The upload pipeline failed |
| `profile_query_failed` | `500` | The profile query failed |
| `internal_error` | `500` | Any other server side failure |

## Known Caveats

- Deleting a texture removes the original file and the preview from disk unconditionally. Another user who uploaded the same file keeps their database row, but loses the files, so their `pull` and `preview` calls start failing.
- The `remember_token` and `rt` form fields are gone. Only the bearer token works.
- `GET /profile/textures` is shelved.
- `type=all` on the list endpoint does not include capes.
- The tag filter only looks at the first tag of the stored tag string.
- There is no texture detail endpoint and no texture edit endpoint yet.

## Related Pages

- [Overview](/projects/haskinlib/)
- [Architecture](/projects/haskinlib/architecture)
