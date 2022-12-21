# Using Nginx Analyzer


## install debian 10/11 packages

```
sudo apt update
sudo apt install goaccess
```

## run `goaccess` server

```
goaccess  .dist/data/nginx/logs/apm_access.log -c --log-format='"%d:%t +%^" client=%h method=%m request="%r" request_length=%^ status=%s bytes_sent=%b body_bytes_sent=%^ referer=%R user_agent="%^" upstream_addr=%^ upstream_status=%^ request_time=%T upstream_response_time=%^ upstream_connect_time=%^ upstream_header_time=%^"' --date-format=%d/%b/%Y --time-format=%T --real-time-html -o ./index.html --ignore-crawlers
```

## run simple http server

```
python3 -m http.server 8080
```

now you can monitor nginx serving on `https://<domain-name>:8080`