# Configuration and Build

HRPAuth Web has no environment variables and no config endpoint. The backend addresses come from two JSON files: one for development, one for production. This page explains what each field means, how the values are cleaned, and what the deployment needs.

## Two Configuration Sets

### Development: `config/backend-dev.json`

`vite.config.ts` reads this file at startup and uses the two addresses as proxy targets. Nothing in the browser sees them.

```json
{
  "baseUrl": "https://ha.example.com",
  "skinlibUrl": "http://127.0.0.1:2701"
}
```

Both fields are required. The file is parsed with a plain `JSON.parse`, so a missing `skinlibUrl` makes `npm run dev` fail before the server starts.

### Production: `public/config.json`

This is the runtime configuration. The build copies `public/` into `dist/`, so the file lands at `dist/config.json`, and the browser fetches it from `${BASE_URL}/config.json` with caching disabled.

```json
{
  "baseUrl": "https://ha.example.com/",
  "skinlibUrl": "https://skin.example.com/"
}
```

Because it is a plain static file, you can edit it on the server after deployment. There is no need to rebuild.

## Field Semantics

### `baseUrl`

The HRPAuth core. The frontend uses it for the business API, for `GET /status`, and for the `/yggdrasil-api` prefix that the core relays to the Yggdrasil API service.

### `skinlibUrl`

The HASkinLib service. The skin library pages use it for listing, uploading, applying, and deleting textures.

In development the browser never sees this address. It is rewritten to `/skinlib-api` and the Vite proxy forwards it to `skinlibUrl`.

## Cleaning and Fallback Behaviour

`src/utils/config.ts` normalises every value it reads.

- backticks, single quotes, and double quotes are stripped
- a trailing slash is removed
- in development, `BackendUrl` stays empty, which means same-origin requests, and `SkinlibUrl` becomes `/skinlib-api`
- in production, both values come from `${BASE_URL}/config.json`

The fallback rules matter more than the cleaning.

- if either field is missing or blank, the whole configuration is ignored and both addresses fall back to the empty defaults
- a malformed or unreachable `config.json` is logged and ignored, and the empty defaults apply
- `getRealBackendUrl()` asks `{baseUrl}/status` for the real backend address and caches the `backend.url` field it returns
- when that request fails, `getRealBackendUrl()` falls back to the relay URL

Business code always reads the exported `BackendUrl` and `SkinlibUrl` constants and never checks the environment itself.

## The Development Proxy

`vite.config.ts` sets up two proxy rules.

- `^/skinlib-api/` goes to `skinlibUrl`, with the prefix stripped
- `^/` goes to `baseUrl`

Vite keeps serving its own internal paths, and any request with a file extension is treated as a static asset. A navigation request that accepts `text/html` falls back to `/index.html`.

## Deployment Requirements

### SPA Fallback

`dist/` is a static bundle with client-side routing. The web server must rewrite unknown paths to `index.html`, otherwise a direct visit to `/dash` returns a 404.

The repository ships an Apache example in `htaccess.example`:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On

  # Skip existing files/directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d

  # Rewrite all other requests to index.html
  RewriteRule ^ index.html [L]
</IfModule>
```

The same content is already in `public/.htaccess`.

### Editing `config.json` After Deployment

The backend addresses are not baked into the bundle. After deploying, edit `dist/config.json` and reload the page. If the frontend and the core live on different origins, the core also has to allow the frontend origin in its CORS setting.

## Other Configuration Files

`config/meta.json` holds the page titles, descriptions, keywords, and Open Graph and Twitter tags. The `useMeta` hook reads it by page key. It is bundled at build time and is not editable at runtime.

## Related Pages

- [Overview](/projects/hrpauth-web/)
- [Architecture](/projects/hrpauth-web/architecture)
- [HRPAuth](/projects/hrpauth/configuration): the CORS and port settings on the backend side
