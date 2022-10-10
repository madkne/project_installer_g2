# Project Installer

clone, build, and run the project with nginx and caddy on multiple sub domains on ONE server

> every app, must be have a `Dockerfile` file and can have `prod.config.js` file to run more scripts

## supported databases

- mysql
- redis
- mongo
	
## Requirements
 - docker
 - docker-compose
 - node 12 or higher
 - DAT (Developer Automation Tool)


## How to use

- create `.env.prod.json` file as sample (to define your apps and used databases)
- `dat p i` install/update project
- `dat p stp` stop docker containers


## install docker

### debian 10/11
```
sudo apt-get update
sudo apt-get install \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
```

## install docker-compose

### debian 10/11
```
sudo apt update
sudo apt install -y curl wget
curl -s https://api.github.com/repos/docker/compose/releases/latest | grep browser_download_url  | grep docker-compose-linux-x86_64 | cut -d '"' -f 4 | wget -qi -
chmod +x docker-compose-linux-x86_64
sudo mv docker-compose-linux-x86_64 /usr/local/bin/docker-compose
```

## install node.js 14

### Ubuntu / Debian / Linux Mint
```
sudo apt update
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
cat /etc/apt/sources.list.d/nodesource.list
sudo apt -y install nodejs
sudo apt -y install gcc g++ make
```

# install DAT
```
sudo npm i -g dat-tool
```


# `prod.config.js` file

## supported functions

- `init`
- `finish`
- `beforeBuild`
- `compileFiles` : return list of files that must compiled with config variables

## Authors
- project_installer was built by DAT 0.5.9
- madkne