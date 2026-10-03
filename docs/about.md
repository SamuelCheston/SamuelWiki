# About HRPAuth

HRPAuth is a powerful, extensible, and maintainable authentication system environment designed for Minecraft communities. It leverages a microservices architecture to provide a full-featured authentication experience.

## Goals

- Provide a secure and reliable authentication entry point for Minecraft players.
- Ensure high availability and scalability through a microservices-based design.
- Offer a seamless experience with official and third-party service integration.
- Simplify the deployment and management of complex authentication environments.

## Core Features

- **Microservices Architecture**: Components like HRPAuth, HASkinLib, WinnerProxy, and HASkinProxy work together efficiently.
- **Extensibility**: Easily integrate third-party services to extend the ecosystem.
- **Easy Configuration**: Simple YAML-based configuration for all services.
- **Performance**: Optimized for high-concurrency authentication requests.

## Project Ecosystem

- **HRPAuth**: The core service providing OAuth2 and Yggdrasil-API.
- **HASkinLib**: A dedicated library for managing and serving Minecraft skins.
- **WinnerProxy**: A proxy service that reserves UUIDs for Mojang players.
- **HASkinProxy**: Translates Yggdrasil-API requests to CustomSkinLoader-API.
