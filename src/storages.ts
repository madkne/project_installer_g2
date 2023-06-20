import { ProjectConfigs, Storage } from "./types";
import * as fs from 'fs';
import * as path from 'path';
import * as OS from '@dat/lib/os';

export async function normalizeMysql(configs: ProjectConfigs, storageName: string, db: Storage) {

    db.argvs = [
        '--character-set-server=utf8mb4',
        '--collation-server=utf8mb4_unicode_ci',
        // '--tls-version=invalid',
        '--skip-ssl',
        '--default-authentication-plugin=mysql_native_password',
    ]
    db['capAdd'] = 'sys_nice';
    const mysqlHookPath = path.join(configs._env.dist_path, 'hooks', 'mysql', storageName);
    fs.mkdirSync(mysqlHookPath, { recursive: true });
    let initSqlFile = `#!/bin/bash

set -eo pipefail\n`;
    // initSqlFile += `mysqld --default-authentication-plugin=mysql_native_password --character-set-server=utf8 --collation-server=utf8_general_ci --tls-version=invalid --skip-ssl --ssl-mode=DISABLED\n`;
    // initSqlFile += `mysqld  --tls-version=invalid --skip-ssl --ssl-mode=DISABLED\n`;
    if (!db.image) db.image = 'mysql:8.0';
    db.realPort = 3306;
    // =>add volumes
    const mysqlDataPath = path.join('data', 'mysql_data', storageName);
    fs.mkdirSync(path.join(configs._env.dist_path, mysqlDataPath, '..'), { recursive: true });
    db.volumes = [
        `./${mysqlDataPath}:/var/lib/mysql`,
        // `./hooks/mysql/my.cnf:/etc/mysql/my.cnf`,
    ];
    // =>set envs
    db.envs = {
        MYSQL_ROOT_PASSWORD: db.root_password,
        HOSTNAME: storageName,
        MYSQL_HOST: storageName,
        MYSQL_TCP_PORT: db.port,
        MYSQL_ROOT_HOST: '%',
        TZ: db.timezone,
    };
    // =>set health check
    db.health_check = {
        test: `mysqladmin ping -h localhost`,
        timeout: '2s',
        interval: '1s',
        retries: 300,
    };
    // =>create dbs
    if (db.init_db_names) {
        let dbNameCommands = [];
        for (const name of db.init_db_names) {
            // initSqlFile += `
            // mysql_note "creating '${name}' database..."
            // docker_process_sql --database=mysql <<< "CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            //     \n\n`;
            dbNameCommands.push(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        }
        // initSqlFile += `
        // docker_process_sql --database=mysql <<< "GRANT ALL PRIVILEGES ON * . * TO 'root'@'%';"
        // docker_process_sql --database=mysql <<< "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY '${db.root_password}';" 
        // docker_process_sql --database=mysql <<< "FLUSH PRIVILEGES;"
        //             `;
        // =>create init.sql file
        fs.writeFileSync(path.join(mysqlHookPath, 'init.sql'), dbNameCommands.join('\n\n'));
        db.volumes.push(`./hooks/mysql/${storageName}/init.sql:/docker-entrypoint-initdb.d/init.sql:ro`);
    }

    // =>create init.sh file
    // fs.mkdirSync(mysqlHookPath, { recursive: true });
    // fs.writeFileSync(path.join(mysqlHookPath, 'init.sh'), initSqlFile);
    // await OS.exec(`chmod +x ${path.join(mysqlHookPath, 'init.sh')}`);
    // db.volumes.push(`./hooks/mysql/${storageName}/init.sh:/docker-entrypoint-initdb.d/init.sh:ro`);


    return db;
}
/*********************************** */
export async function normalizeRedis(configs: ProjectConfigs, storageName: string, db: Storage) {

    if (!db.image) {
        db.image = 'redis:alpine';
    }
    db.realPort = 6379;
    db.health_check = {
        test: `redis-cli --raw incr ping`,
        timeout: '2s',
        retries: 30,
        interval: '1s',
    }

    return db;
}
/*********************************** */
export async function normalizeMongo(configs: ProjectConfigs, storageName: string, db: Storage) {
    let initMongoFile = '';
    if (!db.image) {
        db.image = 'mongo:latest';
    }
    /// =>get version of mongo image
    let mongoCommand = 'mongosh';
    let res: string;
    try {
        res = await OS.commandResult(`sudo docker image inspect -f '{{json .ContainerConfig.Env}}' ${db.image}`);
    } catch (e) { }
    if (res) {
        try {
            let _envs = JSON.parse(res) as string[];
            db._version = _envs[_envs.findIndex(i => i.indexOf('MONGO_VERSION') > -1)]?.split('=')[1];
            if (db._version.startsWith('4.')) {
                mongoCommand = 'mongo';
            }
        } catch (e) { }
    }
    db.realPort = 27017;
    db.health_check = {
        test: `${mongoCommand} --eval \\"db.adminCommand('ping').ok\\"`,
        timeout: '30s',
        retries: 300,
        interval: '1s',
    };
    if (db.port !== 27017) {
        initMongoFile += `mongod --port ${db.port}\n`;
        db.realPort = db.port;
    }
    if (!db.volumes) {
        fs.mkdirSync(path.join(configs._env.dist_path, 'data', 'mongo_data', storageName), { recursive: true });
        db.volumes = [
            `./data/mongo_data/${storageName}:/data/db`
        ];
    }
    // =>create dbs
    let createDBCommands = [];
    if (db.init_db_names) {
        for (const name of db.init_db_names) {
            createDBCommands.push(`
                        db_${name} = db.getSiblingDB('${name}')`);
        }
    }
    let createRootUser = '';
    if (db.root_password) {
        createRootUser = `
        db.createUser(
            {
                user: "root",
                roles: [
                    {
                        role: "root",
                        db: "admin"
                    },
                ]
            }
        );
        db.changeUserPassword('root',"${db.root_password}");
        `
    }
    // =>create init mongo script
    const mongoHookPath = path.join(configs._env.dist_path, 'hooks', 'mongo', storageName);
    fs.mkdirSync(mongoHookPath, { recursive: true });
    fs.writeFileSync(path.join(mongoHookPath, 'init.sh'), `
set -e
${initMongoFile}
${mongoCommand} <<EOF

${createDBCommands.join('\n\n')}

${createRootUser}
EOF
                    `);
    db.volumes.push(`./hooks/mongo/${storageName}/init.sh:/docker-entrypoint-initdb.d/mongo-init.sh:ro`);

    db.envs = {
        TZ: db.timezone,
    };
    if (db.root_password) {
        db.envs['MONGO_INITDB_ROOT_USERNAME'] = 'root';
        db.envs['MONGO_INITDB_ROOT_PASSWORD'] = db.root_password;
    }


    return db;

}
