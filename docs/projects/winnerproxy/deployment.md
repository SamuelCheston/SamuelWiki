# Deployment

How to run WinnerProxy in production: binary layout, process supervision, container deployment, and the bring-up checks.

## Prerequisites

- A running HRPAuth core with the HRPAuth Yggdrasil API service registered behind its `/yggdrasil-api` relay
- An OAuth2 client on the core that WinnerProxy can use (`client_credentials` grant)
- Outbound HTTPS to `sessionserver.mojang.com` and `api.minecraftservices.com`, unless the Mojang fallback is disabled
- The binary reads and writes `config.yml` next to the executable, so that directory must be writable on first start

## Single-Instance Design

WinnerProxy is a single-instance design: in-process freecache, no shared state, no leader election. Multiple instances behind a TCP/HTTP load balancer work, with the caveats listed in [Troubleshooting](/projects/winnerproxy/troubleshooting) (per-instance cache hit rate, shared credentials). For most operators one process on one host is enough.

## Binary Deployment

1. Copy the `winnerproxy` binary into a directory of your choice.
2. Run `./winnerproxy` from any working directory. On the first start the service writes a default `config.yml` **next to the executable** (the location is derived from the executable path, not the working directory) and logs that it has to be edited.
3. Fill in `upstreams.hrpauth.client_id` / `client_secret` (and `hrpauth.*` when set separately). With empty credentials the startup log prints `WARN: hrpauth client_id or client_secret is empty; proxy-authenticated requests will fail` and every upstream call that needs the token fails.
4. Restart the service. Configuration is read once at startup; there is no hot reload.
5. `chown` the directory to the service user and `chmod 600 config.yml` — the file contains a client secret.

### systemd unit (template)

```ini
# /etc/systemd/system/winnerproxy.service
[Unit]
Description=WinnerProxy
After=network.target

[Service]
Type=simple
# Set User / Group as needed. WorkingDirectory is not required:
# the config path is derived from the executable location.
ExecStart=/path/to/winnerproxy
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/path/to/winnerproxy-dir

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now winnerproxy
sudo systemctl status winnerproxy
```

Replace `ExecStart` and `ReadWritePaths` with the actual deployment paths.

## Container Deployment

HA-Services-Deployer ships the compose service and the configuration template for containerized deployments: the image runs the binary from `/app`, renders `config.yml` from `CONFIG_TEMPLATE` / `RENDERED_CONFIG`, and publishes port `2777`. See [Container Orchestration](/projects/ha-services-deployer/container-orchestration) for the template and environment variables.

## Bringing It Up

After starting, run these three checks; all should succeed:

```bash
# 1. WinnerProxy itself (default port 2777)
curl http://127.0.0.1:2777/health
# → {"status":"ok"}

# 2. The HRPAuth management root is reachable (default port 2778)
curl http://127.0.0.1:2778/
# → Yggdrasil meta JSON

# 3. Mojang outbound is reachable
curl -sI 'https://sessionserver.mojang.com/session/minecraft/hasJoined?username=Notch'
# → 204/200 (204 is fine)
```

Point the Minecraft clients at the proxy with authlib-injector — the JVM argument takes the proxy root (or the `/winnerproxy` prefix):

```text
-javaagent:authlib-injector.jar=http://your-winnerproxy:2777
```

## Production Checklist

- [ ] `config.yml` is `chmod 600` and owned by the service user
- [ ] `upstreams.hrpauth.url` carries the `/yggdrasil-api/` relay prefix; `hrpauth.url` (when set) is the bare management root
- [ ] The OAuth2 client exists on the core and the credentials in `config.yml` match it
- [ ] HRPAuth and Mojang reachability checks above both pass
- [ ] `/health` answers from your monitoring location
- [ ] `config.yml` is backed up in your secrets handling (never commit it)

## Resource Footprint

Approximate, for capacity planning:

| Resource | Footprint | Notes |
|---|---|---|
| Memory | ~100 MiB + Go heap | `cache.size` defaults to 100 MiB; the process itself adds roughly 50–80 MiB |
| CPU | near zero at rest | One core serves hundreds of QPS |
| Disk | none | No on-disk state |

## What Not to Do

- Do not expose WinnerProxy directly to the public internet. It should be reachable only on the network between the Minecraft servers and HRPAuth; unauthenticated public exposure of a Yggdrasil endpoint invites session abuse.
- Do not run it as root; use a dedicated service user.
- Do not put the client secret on any network the Minecraft servers can reach; it is a service-level credential.
- Do not hot-reload the configuration; restart the process after editing `config.yml`.
- Do not set `cache.size` to `0` expecting "unlimited" — `0` disables the cache.

## Related Pages

- [Configuration](/projects/winnerproxy/configuration): every configuration key
- [Troubleshooting](/projects/winnerproxy/troubleshooting): log lines and failure modes
- [Container Orchestration](/projects/ha-services-deployer/container-orchestration): the deployer templates
