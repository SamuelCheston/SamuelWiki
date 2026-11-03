# HRPAuth Web

HRPAuth Web is the official web frontend of the HRPAuth authentication core. It serves the account portal — login, registration, account security, skin library — and carries the SDK pages that ecosystem services inject at build time.

## What It Covers

- Account portal: login, registration, email verification, password recovery
- Account security: profile, TOTP, recovery keys, WebAuthn passkeys
- Skin library: browse, upload, apply, and delete skins and capes
- A debug view for inspecting backend API traffic
- SDK routes, menu entries, dashboard items, and profile cards injected at build time

## Tech Stack

- React 19, TypeScript 5.9, Vite 7
- React Router 7 for routing
- MUI v7 with Emotion for the component layer
- i18next 26 with `en` and `zh-CN` locales
- skinview3d for 3D skin preview, qrcode.react for TOTP QR codes
- Vitest, Testing Library, and jsdom for tests
- ESLint 9 with typescript-eslint

The build output is a pure static SPA. It talks to the backends over HTTP and holds no server side.

## Directory Layout

```text
src/pages/        # route components: Home, Skinlib, Dashboard, Login, Register, ...
src/api/          # backend call wrappers, one module per domain
src/components/   # Layout, Navbar, Captcha, LanguageSwitcher, recovery key sheet
src/hooks/        # shared hooks such as useMeta
src/utils/        # config, api, auth, cookie, dataCache, email, webauthn
src/generated/    # build-time SDK aggregation output
src/i18n/         # i18next setup and the locale files
src/types/        # shared TypeScript types
config/           # backend-dev.json, meta.json
public/           # config.json, logo.svg, .htaccess
```

## Running It

### Prerequisites

- Node.js 22 or newer, with npm
- a reachable HRPAuth core for `baseUrl`
- a reachable HASkinLib service for `skinlibUrl`

### Build

```bash
npm install
npm run build
```

`npm run build` runs `tsc -b && vite build`, and the result lands in `dist/`. Two more scripts are worth knowing:

```bash
npm run lint
npm run test:run
```

### Run

```bash
npm run dev
```

The dev server proxies everything to the backend addresses in `config/backend-dev.json`, so the browser stays on a single origin. `npm run preview` serves the built `dist/` locally.

## Configuration

There are two configuration files, and they do different jobs.

- `config/backend-dev.json` is read by Vite at startup and sets the dev proxy targets. Both `baseUrl` and `skinlibUrl` are required; without `skinlibUrl` the dev server fails to start.
- `public/config.json` is the runtime configuration. The build copies it to `dist/config.json`, and you can edit it on the server afterwards without rebuilding.

See [Configuration and Build](/projects/hrpauth-web/configuration) for the field semantics, the cleaning rules, and the deployment requirements.

## Relationship With Other Projects

- **Consumes** [HRPAuth](/projects/hrpauth/) as the main backend
- **Consumes** [HASkinLib](/projects/haskinlib/) for the skin library
- **Reaches** [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) through the `/yggdrasil-api` prefix exposed by the core
- **Is extended by** [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/), which injects SDK packages into the build

## Related Pages

- [Architecture](/projects/hrpauth-web/architecture): how the layers, routes, and SDK injection fit together
- [Configuration and Build](/projects/hrpauth-web/configuration): the two configuration sets and the deployment checklist
- [HRPAuth](/projects/hrpauth/): the backend this frontend talks to
