# Configure project

you must config your project in YML syntax.
you can use variables on value of config properties.

config files must be have such pattern: `configs.[env].yml`

## `project`

|property name| required | type | default | description |
|:-------:|:-------:|:-------:|:-------:|:-------:|
| name | **YES** | string | - | name of project |
| version | NO | number | 1 | version of project (used for docker image tags) |
| extends | NO | string | - | name of another environment to inherit |
| docker_register | NO | string | `docker.io` | can be every docker registry like `dockerhub.ir` and should used in dockerfiles of apps|
| debug | NO | boolean | false | if true, show logs and commands on process |

<!-- | sub_domains | **YES** | Array of [Sub domain](#sub-domain) | define applications on different sub domains. |
| domain_name | **YES** | string | - | domain name like `sample.io`
| ssl_enabled | NO | boolean | using ssl or not |
| databases | NO |  Array of [Database](#database) | defined used apps databases| 
| variables | NO | object | any other variables that applications maybe to needs | -->
<!-- | redirects | NO | Array of [Redirect](#redirect) | define different redirects| -->

## `services`

|property| required | description|
|-------| ------- | --------- |
| sub_domain | **YES** | name of subdomain like 'app' |
|disabled | NO | ignore this subdomain |
| healthcheck | NO | add health check on app| 
| locations| NO | nginx location directive |


## `storages`


## `variables`

any other variables that applications maybe to needs 

### web
#### `locations`
|property| required | description|
|-------| ------- | --------- |
|url|**YES**|-
|modifier| NO |Having a modifier in the location block will allow NGINX to treat a URL differently.|
|alias| NO | final path|
internal| NO | This tells nginx it's not accessible from the outside|

#### `maintenance`
|property| required | description|
|-------| ------- | --------- |
|enabled|**YES**|is enabled or not
|filename| NO |default is `503.html` in `custom` directory|
allowed_ips| NO | which IPs allow to see real site like `192.168.1.0/24` |

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