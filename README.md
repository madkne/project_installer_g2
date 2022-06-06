# Dadgam Installer
	clone, build, and run Dadgam project
	
## Requirements
 - docker
 - docker-compose
 - node 12 or higher
 - DAT (Developer Automation Tool)

## How to install 
 - install node 12 or higher version
 - install DAT by `npm install -g dat-tool`
 - go to `project_installer` folder
 - type `npm install` to install node types
 - then, type `dat m` , if you want to develop script
 - And for use project_installer script, type `dat play` or just `dat p`

## How to use
 - `dat p i` install/update project
 - `dat p stp` stop docker containers
 - `dat p su` create super user

## Debug Play Script

For debugging play script, you must install `source-map-support` package by type `dat npm -n source-map-support`

## Install Node.js 12

### Ubuntu / Debian / Linux Mint
- sudo apt update
- sudo apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates
- curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash -
- sudo apt -y install nodejs

# Explain Docker files

## Docker file description

- use `python:3.8-slim-buster` as base image]
- install required system packages
- install needed python libraries
- copy project source code to docker image
- run appropriate command, when create a container

## Docker-compose description

- the project has 4 main parts, which are the docker-compose file services
	- mysql database
	- nginx web server
	- caddy
	- app
	- redis for cache
## Authors
- project_installer was built by DAT 0.4.7
- madkne