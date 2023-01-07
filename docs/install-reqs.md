# Install Requirements

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

## install node.js 14

### Ubuntu / Debian / Linux Mint
```
sudo apt update
curl -sL https://deb.nodesource.com/setup_14.x | sudo bash -
cat /etc/apt/sources.list.d/nodesource.list
sudo apt -y install nodejs
sudo apt -y install gcc g++ make
```

## install DAT
```
sudo npm i -g dat-tool
```


