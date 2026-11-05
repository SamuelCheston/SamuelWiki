# Architecture

HRPAuth Web is a single-page app with one clear split: the first-party pages live in `src/pages`, and everything a satellite service contributes arrives as generated files. This page explains that split, how routing works, how SDK packages enter the build, and how the two languages are wired.

## Layered Layout

### Page Layer

`src/pages` holds one component per route: `Home`, `Skinlib`, `Dashboard`, `DashboardDebug`, `Login`, `Register`, `ForgotPassword`, `VerifyEmail`, `Profile`, `AccountSecurity`.

`Profile` and `AccountSecurity` are not routes of their own. They are panels inside `Dashboard`, which renders them from a sidebar list and swaps the visible one without a page reload. The `/profile` route exists only to redirect to `/dash`.

### API Layer

`src/api` wraps the backend calls, one module per domain: `auth`, `register`, `user`, `captcha`, `texture`, `services`.

Every module builds its URL from the exported `BackendUrl` and `SkinlibUrl` constants and calls the shared `request` helper in `src/utils/api.ts`. That helper attaches the access token, and refreshes it once when a call comes back unauthorized.

### Component Layer

`src/components` holds the shell and the reusable widgets: `Layout` with the navigation frame, `Navbar`, `Captcha`, `LanguageSwitcher`, `VerificationMethodPickerDialog`, and the recovery key print sheet.

### Utility Layer

`src/utils` holds the cross-cutting helpers: `config` for the backend addresses, `api` for the request pipeline and token refresh, `auth` for the shared login completion routine, `cookie` for the session cookies, `dataCache` for prefetching dashboard data, `email` for address validation, and `webauthn` for the passkey flow.

### Generated Layer

`src/generated` is written by the build, never by hand. Its files carry a "GENERATED — DO NOT EDIT" header and ship as empty placeholders in the repository.

## Routing and Lazy Loading

### Route Table

- `/` — Home
- `/skinlib` — Skinlib
- `/dash` — Dashboard
- `/dashdebug` — DashboardDebug
- `/login` — Login
- `/register` — Register
- `/forgot-password` — ForgotPassword
- `/verifyemail` — VerifyEmail
- `/profile` — redirects to `/dash`
- the SDK routes injected at build time

### Lazy Loading and Suspense

Every page is loaded through `React.lazy` in `src/App.tsx`. The whole route tree sits inside a single `Suspense` boundary, so one fallback covers both the first-party pages and the SDK routes.

### Chunking

`build.rollupOptions.output.manualChunks` in `vite.config.ts` splits the bundle into four fixed chunks: `react-vendor`, `mui-core`, `mui-icons`, and `skinview3d-vendor`.

## Build-Time SDK Injection

### Placeholder Files

Six files under `src/generated` are empty placeholders that the build overwrites:

- `sdk-routes.tsx` — the route elements mounted inside `<Routes>`
- `sdk-navbar.tsx` — the extra navigation bar entries
- `sdk-dashboard.tsx` — the extra dashboard drawer entries
- `sdk-profile-cards.tsx` — the extra profile cards
- `sdk-critical-operations.tsx` — the entries in the account security critical operations section
- `sdk-manifest.ts` — the list of every injected service

### Service Packages

Each SDK package lands under `src/generated/services/<name>/`. A package carries a `manifest.json` and a `src/` directory.

The `manifest.json` describes what the service contributes: `routes` with a path, a module, and a title; `menu` entries; `dashboard` entries; and the npm `dependencies` the package needs.

Two packages are present in the tree today:

```text
src/generated/services/yggdrasil-api/   # Mojang binding, texture management, API page
src/generated/services/haskinproxy/      # CustomSkinLoader setup page
```

### Where the Injected Items Land

- `sdk-routes` is embedded in `src/App.tsx` as `{sdkRouteElements}`, inside the same `Suspense` boundary as the first-party routes
- `sdk-navbar` is read by `Navbar`
- `sdk-dashboard` is read by the `Dashboard` drawer
- `sdk-profile-cards` is read by `Profile`
- `sdk-critical-operations` is read by `AccountSecurity`

`src/api/services.ts` keeps the presence, route, and relay side channels.

## Internationalization

### Initialization

`src/i18n/index.ts` sets up i18next with the browser language detector.

- resources: `en` and `zh-CN`
- `lng` is `en`, `fallbackLng` is `en`
- `supportedLngs` is exactly `['zh-CN', 'en']`
- detection order: `localStorage`, `navigator`, `htmlTag`
- the choice is cached in `localStorage` under the key `hrpauth-lang`

The comment in that file warns against enabling `nonExplicitSupportedLngs`. Under i18next v26 the init step normalizes `zh-CN` to `zh` and filters it against `supportedLngs`, which makes `zh-CN` look unsupported and sends every lookup back to English.

### Language Switching

`LanguageSwitcher` renders a menu from `SUPPORTED_LANGUAGES` and `LANGUAGE_LABELS`, and calls `i18n.changeLanguage` on selection. The detection cache persists the choice, so a reload keeps the language.

### SDK Service Locales

An SDK package brings its own translations under `services/<name>/src/locales`, and reaches them through its own hook instead of the app-level `t` function. The Yggdrasil API package, for example, uses a `useSdkTranslation` hook.

## Related Pages

- [Overview](/projects/hrpauth-web/)
- [Configuration and Build](/projects/hrpauth-web/configuration)
- [HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/): the service that performs the injection
- [HRPAuth](/projects/hrpauth/): the extension layer behind `/services/*`
