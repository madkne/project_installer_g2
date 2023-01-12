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


## `services`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
| sub_domain | **YES** | string | - | name of subdomain like 'app' |
|disabled | NO | boolean | false | ignore this subdomain |
|clone | **YES** | [Clone](#clone) | - | git clone configurations |
| docker | **YES** | [Docker](#docker) | - | docker configurations |
| web | no | [Web](#web) | - | nginx configurations |


### `clone`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
|url | **YES** | string | - | url of git clone|
|branch | NO | string | master | -|

### `docker`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
|build_kit_enabled | NO | boolean | true | for caching in docker build |
|port | **YES** | string | '80' | example: `"[expose_port]:[host_port]"` or `"[port]"` |
|volumes | NO | string[] | - | - |
|envs | NO | object | - | like: `{my_en1: 'sample'}`|
|links| NO | string[] | - | link to a another service or storage by its name |
| hosts| NO | string[] | - | like: `"chat.domain.com:192.168.31.3"`|
| health_check | NO  | [HealthCheck](#health_check) | - | -| 
| mounts| NO | string[] | - | -|
| depends| NO | string[] | - | depend to a another service or storage by its name|


### `health_check`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
|test | **YES** | string | - | cmd command|
|timeout | NO | string | '30s' | - |
|interval | NO | string | '30s' | -|
|retries | NO | number | 30 | - |

### `web`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
|locations | NO | array of [AppLocation](#location) | - | nginx location directive configurations |
|maintenance| NO | [Maintenance](#maintenance)| - | maintenance mode configurations|
|error_pages | NO | object | - | like: `{'404': '404.html'}` and set custom error pages in `custom/` dir|

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

## `storages`

|property| required | type | default| description|
|-------| ------- | --------- |------- | --------- |
|type | **YES** | `"mysql" | "mongo" | "redis"` | - | type of storage|
|port| NO | number | - | port of storage service, default set by installer|
| init_db_names | NO | string[] | - | databases that must created in initial of storage | 
| root_password | NO | string | - | - |
|allow_public | NO | boolean | - |storage service available from outside|
|timezone | NO | string | UTC | - |
| image| NO | string| - | image of storage, default set by installer|
|volumes| NO | string[]| - | -|
|envs| NO | object| - | -|
|argvs| NO | string[]| - | -|


## `variables`

any other variables that applications maybe to needs 

## sample config
```yml
project:
    name: "{{project_name}}"
    version: 2

domain:
    name: "{{ domain_name }}"
    ssl_enabled: true

services:
    backend:
        sub_domain: .
        clone:
            url: "{{git_base_url}}/backend"
            branch: dev
        docker:
            port: 8000
            volumes:
                - ./data/static:/app/staticfiles
                - ./data/media:/app/media
                - ./data/mysql_backups/:/app/backups
            envs:
                DJANGO_SETTINGS_MODULE: "dg_backend.settings.production"
                UWSGI_WORKERS: 1
                DATABASE_HOST: mysql
                DEBUG_MODE: 0
                HOST_NAME: "{{domain_name}}"
                DB_NAME: "{{project_name}}_db"
                DB_PASS: "tevZ2GHuCG346bmNuSPNvHAjU"
                DB_PORT: 3306
                APP_URL: "http://app.{{domain_name}}"
                CHAT_SERVICE_URL: "https://chat.{{domain_name}}"
                LOG_DATABASE_HOST: mysql
                LOG_DB_NAME: "log_{{project_name}}_db"
                LOG_DB_PASS: "tevZ2GHuCG346bmNuSPNvHAjU"
                LOG_DB_PORT: 3306
                DEBUG: "False"
                SERVER_MODE: "{{server_mode}}"
                SECRET_KEY: "l0!pvL786*G1!p5V9Ts%VV66s&v8Rt%m@N^mvWx#cd5CJUob7a"
                CHAT_SERVICE_TOKEN: "dfsdg2gfdg54dfs6gd2fg1fdg5fg8d42s3a6w8r7"
                MAX_UPLOAD_SIZE: "5000000000"
                RECAPTCHA_SECRET_KEY: "{{recaptcha_site_key}}"
            links:
                - mysql
                - redis
            hosts:
                - "chat.{{domain_name}}:{{server_ip}}"
                - "workflow.{{domain_name}}:{{server_ip}}"
            depends:
                - mysql
                - redis
        web:
            error_pages:
                "502": "{{err502}}"
                "500": "{{err500}}"
                "504": "{{err502}}"
            locations:
                - url: /static
                  alias: /static
                - url: /media
                  alias: /media
                - url: /protected/media
                  alias: /media
                  internal: true
            maintenance:
                enabled: "{{is_maintenance}}"
                filename: maintenance.html
                allowed_ips:
                    - 127.0.0.0/24
                    - "{{officeRangeIPs}}"

    chat:
        sub_domain: chat
        clone:
            url: "{{git_base_url}}/chat-service"
        docker:
            port: "7887:7887"
            volumes:
                - "./data/chat_static:/app/staticfiles"
                - "./data/chat_media:/app/media"
            envs:
                DJANGO_SETTINGS_MODULE: chat_server.settings.production
                UWSGI_WORKERS: 1
                DATABASE_HOST: mongo
                DATABASE_NAME: "chat_{{project_name}}_db"
                DATABASE_PORT: 27017
                DATABASE_USERNAME: root
                DATABASE_PASSWORD: "gYN55oZ"
                DEBUG: "False"
            links:
                - mongo
            depends:
                - mongo
        web:
            error_pages:
                "502": "{{err502}}"
                "500": "{{err500}}"
                "504": "{{err502}}"
            locations:
                - url: /static
                  alias: /static
                - url: /media
                  alias: /media
            maintenance:
                enabled: "{{is_maintenance}}"
                filename: maintenance.html
                allowed_ips:
                    - 127.0.0.0/24
                    - "{{officeRangeIPs}}"

    frontend:
        sub_domain: app
        clone:
            url: "{{git_base_url}}/dadgam-front"
            branch: dev
        docker:
            port: "80:8081"
        web:
            error_pages:
                "502": "{{err502}}"
                "500": "{{err500}}"
                "504": "{{err502}}"

            maintenance:
                enabled: "{{is_maintenance}}"
                filename: maintenance.html
                allowed_ips:
                    - 127.0.0.0/24
                    - "{{officeRangeIPs}}"

storages:
    mysql:
        type: mysql
        port: 3306
        init_db_names:
            - "{{project_name}}_db"
            - "log_{{project_name}}_db"
        root_password: "tevZ2GHuCG346bmNuSPNvHAjU"
        allow_public: true
        timezone: "Asia/Tehran"
    redis:
        type: redis
        port: 6379
        timezone: "Asia/Tehran"
        allow_public: true
    mongo:
        type: mongo
        port: 27017
        init_db_names:
            - "chat_{{project_name}}_db"
            - "workflow_{{project_name}}_db"
        timezone: "Asia/Tehran"
        root_password: "gYN55oZ"
        allow_public: true

variables:
    project_name: sample
    domain_name: "sample.io"
    server_ip: "192.168.1.6"
    api_base_url: "https://{{domain_name}}/api/v1/"
    django_base_url: "https://{{domain_name}}"
    recaptcha_site_key: "6LcXDJsjAAAAAHlMhht3UqYDKSvq-jtzl1BhtrBJ"
    workflowBaseUrl: https://workflow.{{domain_name}}/api/v1/
    server_mode: "cloud"
    git_base_url: "https://github.com/sample"
    appUrl: "https://app.{{domain_name}}/"
    is_maintenance: false
    err502: "502.html"
    err500: "500.html"
    maintenance: "maintenance.html"
    officeRangeIPs: "192.168.1.0/24"

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