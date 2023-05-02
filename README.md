# Project Installer (generation 2)

clone, build, and run your dockerized project with nginx on multiple sub domains on ONE server

## features

- supported YML syntax (with extend files)
- supported multiple environments
- no docker-compose dependency
- supported project profiles
- supported multiple storages
- auto ssl generation
- supported real client IP
- supported maintenance mode
- maximum uptime


## supported databases

- mysql (default: v8.0)
- redis (default: alpine)
- mongo (default: latest)
	
## Requirements
 - docker
 - node 12 or higher
 - DAT (Developer Automation Tool)


## How to use

1. `dat p add --name=test_project`
    - you can set default env in `.dat/.env` file with `defaultEnv` property.
    - default env is `prod`

2. edit `profiles/test_project/configs.prod.yml` file (to define your apps and used databases)

3. `dat p i` install/update project

4. `dat p stp` stop docker containers



## other resources

- [Install Requirements](./docs/install-reqs.md)
- [Application Requirements for Deploy](./docs/app-reqs.md)
- [Generate SSL](./docs/generate-ssl.md)
- [Configure project](./docs/configs.md)
- [Nginx Analyzer](./docs/ngnix_analyzer.md)

## Authors
- project_installer was built by DAT 0.5.9
- madkne