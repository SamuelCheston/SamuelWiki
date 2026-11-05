# Quick Start

This page helps you run, preview, and build the HRPAuth locally.

## Run HRPAuth
HRPAuth is the core service of HRPAuth.  
It provides the HRPAuth OAuth2 business authentication service and the microservice extension layer; the Yggdrasil protocol surface is served by the separate [HRPAuth Yggdrasil API](/projects/hrpauth-yggdrasil-api/) service.
### Download HRPAuth
Download the latest release from [GitHub](https://github.com/CoreMatch/HRPAuth/releases/latest).  
Create a Mysql user `hrpa` with password `hrpa`.  
Create a database `hrpa` owned by `hrpa`.  
Deploy a redis instance without any password.  

### run the release first time.  
run the release.
```bash
./HRPAuth-ver-os-arch
```
It generates the config file, applies the database migrations and ensures the built-in OAuth2 clients, then starts the server.  
You should setup a daemon to keep all of the services running.  
Recommended daemon: [tinyvisor](https://github.com/SamuelCheston/Tinyvisor) [systemd](https://www.systemd.io/) [supervisor](https://supervisord.org/) [aaPanel](https://www.aapanel.com/)

## Run HASkinLib
HASkinLib is the public skin square of HRPAuth.  
According to the original purpose, you should create a individual database for skin library.  
But it should run with the database same as HRPAuth for convenience.
### Download HASkinLib
Download the latest release from [GitHub](https://github.com/CoreMatch/HASkinLib/releases/latest).  

### run the release first time.  
Try to run it to create a config file. 
```bash
./HASkinLib-ver-os-arch
```
modify the config file as you need, there are notes in the file.
```
nano ./config.yaml
```
run the release again.
```bash
./HASkinLib-ver-os-arch
```

## Run WinnerProxy
WinnerProxy provides you the feature of keep both HRPAuth player and Mojang player.  
All mojang players' uuid will be reserved as HRPAuth player's uuid.  
More details in [WinnerProxy](https://github.com/CoreMatch/WinnerProxy).

### Download WinnerProxy
Download the latest release from [GitHub](https://github.com/CoreMatch/WinnerProxy/releases/latest).  

### run the release first time.  
Try to run it to create a config file. 
```bash
./WinnerProxy-ver-os-arch
```
modify the config file as you need, there are notes in the file. Note that WinnerProxy reads `config.yml` (with a `.yml` extension); a `config.yaml` next to it is ignored.
```
nano ./config.yml
```
run the release again.
```bash
./WinnerProxy-ver-os-arch
```
## Run HASkinProxy
HASkinProxy is the proxy which translates the Yggdrasil-API request to CustomSkinLoader-APi request.
More details in [HASkinProxy](https://github.com/CoreMatch/HASkinProxy).

### Download HASkinProxy
Download the latest release from [GitHub](https://github.com/CoreMatch/HASkinProxy/releases/latest).  

### run the release first time.  
Try to run it to create a config file. 
```bash
./HASkinProxy-ver-os-arch
```
modify the config file as you need, there are notes in the file.
```
nano ./config.yaml
```
run the release again.
```bash
./HASkinProxy-ver-os-arch
```