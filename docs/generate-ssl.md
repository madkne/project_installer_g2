# Generate SSL

you can get free certificate from let encrypt:

## debian 9+
```
sudo apt update
sudo apt install snapd # install snap
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot # install certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

## for root domain certificate
```
sudo certbot certonly --standalone --email <email> -d <domain-name>
cp /etc/letsencrypt/live/<domain-name>/fullchain.pem ./env/ssl/root/cert.crt
cp /etc/letsencrypt/live/<domain-name>/privkey.pem ./env/ssl/root/cert.key
```
## for wildcard certificate
```
sudo certbot certonly --manual --preferred-challenges=dns --email <email> --server https://acme-v02.api.letsencrypt.org/directory --agree-tos -d *.<domain-name>
cp /etc/letsencrypt/live/<domain-name>-0001/fullchain.pem ./env/ssl/wildcard/cert.crt
cp /etc/letsencrypt/live/<domain-name>-0001/privkey.pem ./env/ssl/wildcard/cert.key 
```

