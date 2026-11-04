# HRPAuth Spigot

HRPAuth Spigot is a Velocity proxy plugin that binds or migrates an in-game player identity to an HRPAuth platform account. It talks to the HRPAuth core over HTTP as an OAuth2 client — the token endpoint lives on the core, and the administrative routes are served by HRPAuth Yggdrasil API through the core's `/yggdrasil-api` relay — and it never opens a port of its own.

## What It Covers

- Claiming a proxy-registered game account with an email and a password
- Force-binding, which moves a Mojang UUID from a proxy account to a target account
- Service token acquisition and caching through the `client_credentials` grant
- Operator commands under `/ha` and its `/hrpauth` alias

## Tech Stack

- Java 25
- Gradle Kotlin DSL with the Gradle Wrapper
- `com.velocitypowered:velocity-api:4.1.1-SNAPSHOT` as a compile-only dependency
- `org.yaml:snakeyaml:2.2` for the configuration file
- the JDK's `java.net.http.HttpClient` for every request, with no third-party HTTP library
- no database

## Directory Layout

```text
src/main/java/com/hrp/auth/proxy/
  HrpAuthProxy.java      # plugin entry: config load, credential check, command registration
  OAuthClient.java       # client_credentials token fetch and cache
  RegisterCommand.java   # /ha reg
  ForceBindCommand.java  # /ha forcebind
  config/Config.java     # config load and first-run generation
src/main/resources/velocity-plugin.json
build.gradle.kts, settings.gradle.kts, gradlew, gradle/
```

## Running It

### Prerequisites

- Java 25
- a running HRPAuth core with the HRPAuth Yggdrasil API service registered behind its `/yggdrasil-api` relay
- a Velocity proxy server

### Build

```bash
./build.sh
```

That script is a wrapper around `./gradlew build`. The result is `build/libs/HRPAuth-Proxy-1.0-SNAPSHOT.jar`.

### Run

Copy the jar into the Velocity `plugins/` directory and start the proxy. The plugin only acts as a client of the HRPAuth core, whose default address is `http://127.0.0.1:2778`.

## Configuration

The file lives at `plugins/hrpauth-proxy/config.yml`. It is generated with a long comment block on first startup.

```yaml
hrpauth:
  url: http://127.0.0.1:2778
  client-id: ""
  client-secret: ""
  manage-token: ""
  timeout-sec: 10
  verify-tls: true
presence:
  enabled: true
  name: HRPAuth-Proxy
  ttl-seconds: 0
  security-level: 0
site:
  name: HRPAuth-Proxy
  version: 1.0.0
log:
  level: info
  format: text
```

There is no automatic migration. Every start parses the file with snakeyaml, and a missing key falls back to the built-in default.

- `hrpauth.url`: the HRPAuth core address
- `hrpauth.client-id` and `hrpauth.client-secret`: the OAuth2 client credentials. The generated comment points at `oauth2.super_client_id` and `oauth2.super_client_secret` in the core configuration, or at a dedicated client created with `grant_type=client_credentials`
- `hrpauth.manage-token`: the administrative token, needed only by the force-bind command
- `hrpauth.timeout-sec` and `hrpauth.verify-tls`: the HTTP timeout and the TLS verification switch
- `presence.*`: read into the configuration object, but no code path registers the plugin with the service presence API
- `site.*`: the name and version shown in the command banner
- `log.*`: read into the configuration object, but the plugin logs through the Velocity logger as it is

Missing credentials do not stop the plugin. It still starts and prints a warning telling you to edit the config and restart.

## Commands

Only players can run these. Both forms are registered, `/ha` and `/hrpauth`.

### `/ha reg <email> <password>`

Claims the executing player's proxy-registered account.

```http
POST /yggdrasil-api/admin/claim-user HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/json
Authorization: Bearer <service_token>

{"username":"<player name>","email":"<email>","password":"<password>"}
```

The request goes to the core, which relays it to HRPAuth Yggdrasil API where the route is implemented. The player name is read from the proxy session, so it is not an argument.

### `/ha forcebind <email> <password>`

Transfers the player's Mojang UUID from the proxy-registered account to the target account.

```http
POST /yggdrasil-api/admin/force-bind HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/json
Authorization: Bearer <service_token>

{"username":"<player name>","email":"<email>","password":"<password>","manage_token":"<manage_token>"}
```

The target account's credentials are verified against the core; the `manage_token` must match the manage token configured on the HRPAuth Yggdrasil API service.

### Service Token

Both commands need a service token first. The plugin fetches it with the `client_credentials` grant:

```http
POST /oauth/token HTTP/1.1
Host: 127.0.0.1:2778
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=<client_id>&client_secret=<client_secret>
```

The token is cached in memory and refreshed 30 seconds before the `expires_in` window closes.

### Error Codes

The claim command maps these error codes from the response body:

- `user_not_claimable`: the account is already claimed or was never proxy-registered
- `username_already_bound`: the player name is bound to another account
- `user_not_found`: no unclaimed account matches the player name
- `email_already_registered`: the address is already in use

The force-bind command maps these:

- `user_not_found`: no proxy-registered account matches the player name
- `target_not_found`: the target account does not exist
- `invalid_credentials`: the email or password of the target account is wrong
- `invalid_manage_token`: the manage token in the configuration is wrong
- `no_mojang_uuid`: the proxy-registered account has no Mojang UUID to transfer

## Current Status

The plugin calls two administrative routes through the core's relay prefix: `POST /yggdrasil-api/admin/claim-user` and `POST /yggdrasil-api/admin/force-bind`.

- Both routes are implemented in [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/); the claim and force-bind work landed on 2026-11-05 and the HA-Contract roadmap entry is marked implemented. HA-Contract's OpenAPI (`hrpauth-yggdrasil-business.yaml`) defines both paths and their request bodies.
- The historical `POST /user/declare-email` flow for giving a proxy account an email is gone; `/ha reg` (claim) is the replacement.
- This repository ships no long-form design document. Its README is a short summary, and everything above is read from the source.
- Naming is inconsistent in a way that trips people up. The repository is called HRPAuth-Spigot, but the plugin is a Velocity plugin, not a Spigot or Bukkit one. The plugin id is `hrpauth-proxy`, while the Gradle root project is `HRPAuth-Proxy`.

## Relationship With Other Projects

- **Consumes** [HRPAuth](/projects/hrpauth/) over HTTP for the token endpoint, and [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) through the core's `/yggdrasil-api` relay for the administrative routes
- **Is** the only game-side consumer among the HRPAuth projects
- **Does not depend** on [HRPAuth Web](/projects/hrpauth-web/), MySQL, or Redis

## Related Pages

- [HRPAuth](/projects/hrpauth/): the core this plugin talks to
- [API Standards](/projects/ha-contract/api-standards): the contract the administrative routes follow
- [HRPAuth Web](/projects/hrpauth-web/): the account portal a claimed account can then use
