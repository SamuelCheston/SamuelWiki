# Getting Started

## Original Purpose
HRPAuth is a bunch of tools which is aimed at create a authentication system environment.  
To make it extensible and maintainable, we use microservices architecture.  
We recommend you to deploy every official service as long as you can so that you can enjoy the full feature of HRPAuth.  
Besides, you can also deploy third-party services to extend the feature of HRPAuth.

## Minimal quick start ( not recommended, just show the original purpose )
Download the latest release from [GitHub](https://github.com/CoreMatch/HRPAuth/releases/latest).  
Create a Mysql user `hrpa` with password `hrpa`.  
Create a database `hrpa` owned by `hrpa`.  
Deploy a redis instance without any password.  
run the release.
```bash
./HRPAuth-ver-os-arch
```
It will initialize the database schema, config file and key pairs automatically then start the server.
