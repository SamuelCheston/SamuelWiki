---
layout: home

hero:
  name: HRPAuth
  text: Microservices Authentication System
  tagline: A powerful, extensible, and maintainable authentication environment for Minecraft communities.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/
    - theme: alt
      text: Browse Reference
      link: /reference/

features:
  - title: Microservices Architecture
    details: Built with microservices to ensure extensibility and maintainability for modern authentication needs.
  - title: Official & Third-party Services
    details: Deploy official services for full features or integrate third-party services to extend functionality.
  - title: Easy Deployment
    details: Quick start with minimal configuration, supporting MySQL and Redis out of the box.
---

## Key Components

<div class="wiki-grid">
  <a class="wiki-card" href="/guide/">
    <h3>Getting Started</h3>
    <p>Learn the original purpose, deployment steps, and how to get HRPAuth running.</p>
  </a>
  <a class="wiki-card" href="/guide/getting-started">
    <h3>Quick Start</h3>
    <p>Step-by-step instructions for HRPAuth, HASkinLib, WinnerProxy, and HASkinProxy.</p>
  </a>
  <a class="wiki-card" href="/projects/">
    <h3>Projects</h3>
    <p>Per-project documentation for every service in the HA ecosystem.</p>
  </a>
  <a class="wiki-card" href="/faq">
    <h3>FAQ</h3>
    <p>Common questions about setup, configuration, and troubleshooting.</p>
  </a>
  <a class="wiki-card" href="/changelog">
    <h3>Changelog</h3>
    <p>Track the evolution of HRPAuth services and documentation updates.</p>
  </a>
</div>

## Project Ecosystem

<div class="wiki-grid">
  <a class="wiki-card" href="/projects/#authentication--contract">
    <h3>Authentication &amp; Contract</h3>
    <p>HRPAuth, Yggdrasil API, Web UI, skin library, and the skin proxies.</p>
  </a>
  <a class="wiki-card" href="/projects/#service-orchestration">
    <h3>Service Orchestration</h3>
    <p>Deployer, maintenance view, and the WebUI SDK handler.</p>
  </a>
  <a class="wiki-card" href="/projects/#match--arena">
    <h3>Match &amp; Arena</h3>
    <p>MatchCoreArena server, client, maintenance view, and the Bedwars plugins.</p>
  </a>
  <a class="wiki-card" href="/projects/#clients--tools">
    <h3>Clients &amp; Tools</h3>
    <p>Desktop clients and standalone utilities maintained alongside the stack.</p>
  </a>
</div>

### Authentication & Contract

- **[HA-Contract](/projects/ha-contract/)**: Single source of truth for API contracts and specifications.
- **[HRPAuth](/projects/hrpauth/)**: Core authentication service (OAuth2, Yggdrasil-API).
- **[HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/)**: Yggdrasil API provider and game account management.
- **[HRPAuth Web](/projects/hrpauth-web/)**: Frontend SPA for the authentication service.
- **[HRPAuth Spigot](/projects/hrpauth-spigot/)**: Minecraft server plugin that binds the stack to your proxy.
- **[HASkinLib](/projects/haskinlib/)**: Public skin library square.
- **[HASkinProxy](/projects/haskinproxy/)**: API translation proxy for skin loaders.
- **[WinnerProxy](/projects/winnerproxy/)**: Reserved UUID support for Mojang players.

### Service Orchestration

- **[HA Services Deployer](/projects/ha-services-deployer/)**: One-command deployment for the whole service stack.
- **[HA Services Maintenance View](/projects/ha-services-maintenanceview/)**: Operational dashboard for the deployed services.
- **[HA WebUI SDK Handler](/projects/ha-webui-sdkhandler/)**: Builds satellite SDKs into the WebUI at compile time.

### Match & Arena

- **[MatchCoreArena Server](/projects/matchcorearena-server/)**: Authoritative server for arena matchmaking.
- **[MatchCoreArena Client](/projects/matchcorearena-client/)**: Companion client and lobby for the arena service.
- **[MatchCoreArena Maintenance View](/projects/matchcorearena-maintenanceview/)**: Desktop dashboard for arena operations.
- **[BedwarsRel](/projects/bedwarsrel/)**: Bedwars match plugin with multi-version support.
- **[BedwarsRel MCA](/projects/bedwarsrel-mca/)**: BedwarsRel variant built for MatchCoreArena.

### Clients & Tools

- **[SamuelClient](/projects/samuelclient/)**: Desktop client for personal account management.
- **[BS2HA](/projects/bs2ha/)**: Offline CLI that migrates a Blessing-Skin-Server database into HRPAuth.

## Suggested Reading Paths

<div class="wiki-list">
  <div class="wiki-list-item">
    <strong>1. New Administrators</strong>
    Start with the <a href="/guide/">Overview</a> and then follow the <a href="/guide/getting-started">Quick Start</a> guide.
  </div>
  <div class="wiki-list-item">
    <strong>2. Advanced Configuration</strong>
    Learn how to customize your setup in <a href="/guide/how-to-use-conf-file">Configuration Guide</a>.
  </div>
  <div class="wiki-list-item">
    <strong>3. Working on a Project</strong>
    Jump straight to the <a href="/projects/">Projects</a> section and read the page for the service you are changing.
  </div>
  <div class="wiki-list-item">
    <strong>4. Deployment Owners</strong>
    Review the <a href="/reference/deployment">Deployment Reference</a> for production-ready setups.
  </div>
</div>
