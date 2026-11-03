# Architecture

HASkinLib is a small layered service. The handlers sit in `controllers/`, the business rules in `services/`, the persistence in `models/` and `database/`. Knowing which layer owns a decision is the fastest way to read the code.

## Layers

### Controllers

- parse and validate the request
- call exactly one service
- shape the answer through `controllers/api_response.go`
- the shared authentication step lives in `controllers/auth.go`

### Services

- `services/upload_service.go`: PNG validation, size normalization, preview rendering, hashing, and the upsert into the list tables
- `services/delete_texture_service.go`: record deletion plus the forced cleanup of the files on disk
- `services/upload_rate_limiter.go`: the in-process upload limiter

### Persistence

- `models/models.go` maps `TextureListSkin` and `TextureListCape`, and derives the table name from `database.table_prefix`
- `database/database.go` opens the GORM connection
- `database/migrations/` holds the embedded SQL files

## Upload And Preview Pipeline

```text
POST /texture/upload
  -> UploadController: body size limit, bearer auth, rate limit
  -> TextureUploadService: PNG decode, size rule, normalization
  -> SHA-256 hash of the normalized PNG
  -> preview rendering and WebP encoding
  -> write <hash> to storage_dir, write <hash>_<type>.webp to preview_storage_dir
  -> upsert into <prefix>texture_list_skin or <prefix>texture_list_cape
```

A few details that change how you read the code.

- The hash is computed on the normalized PNG, so a 22x17 cape and its 64x32 version share one hash and one file.
- The original file is stored under its hash alone, without an extension.
- A skin preview is a 2D full-body rendering, a cape preview is the flat front face of the cape.
- Previews are encoded with `nativewebp` at the best compression level and scaled eight times with nearest neighbour.
- When the same user uploads the same file again, the record is updated and the response is `200 OK` instead of `201 Created`.

## Storage Layout

- original PNG: `textures.storage_dir/<sha256>`, no extension
- preview: `textures.preview_storage_dir/<sha256>_<type>.webp`
- metadata: `<prefix>texture_list_skin` and `<prefix>texture_list_cape`, both unique on `(uid, hash)`

## From A Shared Database To A Dedicated One

Earlier versions shared the HRPAuth database and read the `users`, `oauth2_access_tokens`, and `profiles` tables directly. The service now runs against its own database and reaches HRPAuth over HTTP.

- The two list tables carry the `hasl_` prefix, so they no longer collide with the HRPAuth tables.
- The prefix is applied to the embedded migration SQL at startup, so the same migration files serve any prefix.
- Authentication moved to the HRPAuth core API, so no token table is read here any more.
- `startup_controller.go` requires a standard `schema_migrations` table. A leftover `service` column from the shared era makes the process refuse to start and point you at a dedicated database.
- The shared migration history cannot be reused, so a dedicated database starts from the baseline migration.

The old coupling is still a risk when you change tables. A deployment that still points at the HRPAuth database and one that points at a dedicated database do not see the same data.

## Authentication

- The client sends `Authorization: Bearer <access_token>`.
- `controllers/auth.go` forwards the token to `POST <core_api.base_url>/internal/verify-token`.
- On success it refreshes the user with `GET <core_api.base_url>/services/users/<uuid>` and uses the `uid` from that answer as the owner of the texture.
- Service-to-service calls use the clientcredentials token built from `core_api.client_id` and `core_api.client_secret`. When they are empty the client falls back to unauthenticated calls and the core API decides whether to accept them.
- `GET /texture/preview/:preview_file` and `GET /texture/pull/:hash` are public and need no token.

## Rate Limiting And Caching

- The upload limiter is an in-process sliding window in `services/upload_rate_limiter.go`.
- It is checked twice per upload, once against the bearer token and once against the client IP.
- There is no Redis and no shared counter, so the limit applies per instance.
- The service keeps no in-process cache of textures or previews. The only caching is the `Cache-Control: public, max-age=86400` header on the preview and pull routes.

## Related Pages

- [Overview](/projects/haskinlib/)
- [API](/projects/haskinlib/api)
