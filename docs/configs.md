# Configure project

|property name| required | type | default | description |
|:-------:|:-------:|:-------:|:-------:|:-------:|
| docker_registery | NO | string | `docker.io` | can be every docker registry like `dockerhub.ir` and should used in dockerfiles of apps|
| project_name | **YES** | string | - | used for docker compose and the other places|
| sub_domains | **YES** | Array of [Sub domain](#sub-domain) | define applications on different sub domains. |
| domain_name | **YES** | string | - | domain name like `sample.io`
| ssl_enabled | NO | boolean | using ssl or not |
| databases | NO |  Array of [Database](#database) | defined used apps databases| 
| variables | NO | object | any other variables that applications maybe to needs |
<!-- | redirects | NO | Array of [Redirect](#redirect) | define different redirects| -->

## Sub domain

|property| required | description|
|-------| ------- | --------- |
| subdomain | **YES** | name of subdomain like 'app' |
|disabled | NO | ignore this subdomain |
| healthcheck | NO | add health check on app| 

### `healthcheck`

|property| required | description|
|-------| ------- | --------- |
| test | **YES** | shell command with zero return |
| timeout | NO | default is `1` |
| retries | NO | default is `30` | 


## sample
```
[
    {
        "subdomain": "",
        "cloneUrl": "https://gitlab.com/project/backend",
        "branch": "dev",
        "name": "backend",
        "port": 8000,
        "volumes": [
            "./data/static:/app/staticfiles",
            "./data/media:/app/media",\
        ],
        "envs": {
            "DJANGO_SETTINGS_MODULE": "dg_backend.settings.production",
            "UWSGI_WORKERS": 1,
            "DATABASE_HOST": "mysql"
        },
        "hosts": [
            "chat.{{domain_name}}:192.168.31.167"
        ],
        "depends": [
            "mysql",
            "redis"
        ]
    }
]
```


## Database

sample:
```
[
    {
        "name": "mysql",
        "type": "mysql",
        "port": 3306,
        "dbname": "{{project_name}}_db",
        "root_password": "tevZ2GHuCG346bmNuSPNvHAjU",
        "allow_public_db": false
    }
]

```


## Redirect

|property| required | description|
|-------| ------- | --------- |
| type | **YES** | type of redirection|
|src_url | NO | source url or domain name |

<!-- ### redirection types

#### `non2www`

redirect a sub domain to its www based. like redirect `app.sample.com` to `www.app.sample.com`
> it useful for root domain that can used a wildcard certificate.

## sample
```
[
    {
        "type": "non2www",
        "src_url": "api.{{domain_name}}"
    }
]
``` -->