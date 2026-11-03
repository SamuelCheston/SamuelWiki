# Configuration

WinnerProxy reads a single `config.yml` from the directory that holds the executable. This page explains where the file comes from and what each block controls.

## File Location and Version

- The file name is `config.yml`, with a `.yml` extension, next to the executable and not in the project root
- When the file is missing, the service writes a default one and logs that it has to be edited before a restart
- When the file exists, the values are read over the built-in defaults, so a key you leave out keeps its default value
- The file carries `version: "2"`, the schema version of the configuration. WinnerProxy does not migrate older files, it only fills in the missing keys with the current defaults

A Docker image runs the binary from `/app`, so the file lives in `/app/config.yml`. The entrypoint can render it from a template with `CONFIG_TEMPLATE` and `RENDERED_CONFIG`.

## Top-level Blocks

- `server`
- `cache`
- `log`
- `upstreams`
- `hrpauth`
- `site`
- `version`

## Server

```yaml
server:
  addr: ":2777"
  public_url: "http://127.0.0.1:2777"
  read_timeout_sec: 15
  write_timeout_sec: 15
```

- `addr`: the listen address of the HTTP server
- `public_url`: the address clients can reach. It is the source side of the relay rules, and it is what the WebUI shows
- `read_timeout_sec`, `write_timeout_sec`: timeouts in seconds for reading a request and writing a response

## Cache

```yaml
cache:
  size: 104857600
  ttl_sec: 300
```

- `size`: the cache capacity in bytes. The default is 100 MiB. `0` turns the cache off and every lookup goes to the upstream
- `ttl_sec`: how long a profile stays in the cache. The default is 300 seconds. A value of `0` or less falls back to five minutes

## Log

```yaml
log:
  level: "info"
  format: "text"
```

- `level`: `debug`, `info`, `warn` or `error`
- `format`: `text` or `json`

## Upstreams

### `upstreams.hrpauth`

```yaml
upstreams:
  hrpauth:
    url: "http://127.0.0.1:2778/yggdrasil-api/"
    client_id: ""
    client_secret: ""
    timeout_sec: 10
    enabled: true
```

- `url`: the HRPAuth Yggdrasil upstream. This is the URL the Yggdrasil calls are sent to
- `client_id`, `client_secret`: the OAuth2 client credentials used for the token request. With empty values, the startup log warns and every proxy-authenticated request fails
- `timeout_sec`: per-request timeout in seconds
- `enabled`: whether the upstream is active

### `upstreams.official`

```yaml
  official:
    url: "https://api.minecraftservices.com"
    timeout_sec: 10
    enabled: true
```

- `url`: the official Mojang services
- `timeout_sec`: per-request timeout in seconds. `0` disables the timeout of the HTTP client
- `enabled`: set it to `false` to run without the Mojang fallback. Mojang players then get `204`

## HRPAuth Management

```yaml
hrpauth:
  url: "http://127.0.0.1:2778"
  client_id: ""
  client_secret: ""
  presence:
    enabled: true
    name: "WinnerProxy"
    ttl_seconds: 0
  sdk:
    enabled: true
    url: ""
```

This block points at the HRPAuth management root, not at the Yggdrasil upstream. It is used for the presence handshake, the relay registration and the SDK upload.

- `url`: the management root. The default `http://127.0.0.1:2778` is correct
- `client_id`, `client_secret`: the management credentials. When `client_id` is empty, they fall back to the credentials of `upstreams.hrpauth`, and the URL falls back to the upstream URL with `/yggdrasil-api` stripped off
- `presence.enabled`: whether the presence handshake runs at startup
- `presence.name`: the service name registered in HRPAuth
- `presence.ttl_seconds`: the lifetime of the registration. `0` means the record never expires
- `sdk.enabled`: whether the SDK package is uploaded to HRPAuth at startup
- `sdk.url`: the API URL shown in the SDK page. When empty, the relay-registered URL is used

## Site

```yaml
site:
  name: "WinnerProxy"
  version: "0.2.0"
```

Non-runtime metadata about the deployment. The name appears in the presence registration and the version tells you which build is running.

## Commonly Missed Details

- The file is `config.yml`, not `config.yaml`. A `config.yaml` next to the binary is ignored, and a fresh default file is written instead
- `hrpauth.url` must be the management root. Putting `/yggdrasil-api` there sends the presence and relay calls to the wrong place
- `server.public_url` has to be reachable by the clients that use the relay. When it is empty, the relay registration is skipped and the WebUI cannot route to the proxy
- `cache.size = 0` is the switch that disables the cache. It does not mean "no limit"
- `upstreams.official.enabled = false` removes the Mojang path completely, including the automatic registration of Mojang players
- The client credentials are an OAuth2 client on HRPAuth. A business access token does not work here
- Missing keys are not an error. The service keeps the default value and keeps running

## Smoke Test

After a fresh start, check these two routes first.

- `GET /health`
- `GET /winnerproxy`

If both answer, the listener is up and HRPAuth is reachable. The presence handshake result is only visible in the log and in the WebUI.

## Related Pages

- [Overview](/projects/winnerproxy/)
- [Architecture](/projects/winnerproxy/architecture)
- [Configuration Guide](/guide/how-to-use-conf-file)
