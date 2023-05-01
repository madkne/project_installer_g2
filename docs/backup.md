# Backup


## get started

for backup from services or storages, you need define `backup` setting in your config.

1. install `ftp` package

```bash
sudo apt install ftp
```

2. config `ftp` backup server:

```yml

settings:
    type: ftp
    host: ftp.backup-server.com
    username: ftp_root
    password: "xsdf3254325dsfsdfsdf"

```

3. define backup plan for your mysql storage:

> for now, just support backup from mysql storage

you can define a custom name for your backup plan. then use `https://crontab-generator.org/` website to generate `crontab` time
```yml

plans:
    - mysql_backup:
        storage_name: mysql
        remote_path: "/mysql"
        human_time: 12h

```
