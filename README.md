# Project Installer

clone, build, and run the project with nginx and caddy on multiple sub domains on ONE server
	
## Requirements
 - docker
 - docker-compose
 - node 12 or higher
 - DAT (Developer Automation Tool)


## How to use

- create `.env.prod.json` file as sample (to define your apps and used databases)
- `dat p i` install/update project
- `dat p stp` stop docker containers


## Authors
- project_installer was built by DAT 0.5.9
- madkne