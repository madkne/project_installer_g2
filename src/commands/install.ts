import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { loadAllConfig, loadSubDomains, stopContainers } from '../common';
import { CommandArgvName, CommandName, ConfigsObject, Database } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as LOG from '@dat/lib/log';
import * as IN from '@dat/lib/input';
import * as ENV from '@dat/lib/env';
import * as OS from '@dat/lib/os';
import * as GIT from '@dat/lib/git';
import * as TEM from '@dat/lib/template';



@cliCommandItem()

export class InstallCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ConfigsObject;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'install';
    }

    get alias(): string {
        return 'i';
    }

    get description(): string {
        return 'install server'
    }

    get argvs(): CommandArgvItem<CommandArgvName>[] {
        return [
            {
                name: 'skip-remove-unused-images',
                alias: 's1',
                description: 'skip remove unused images',
                type: 'boolean',
            },
            {
                name: 'skip-clone-projects',
                alias: 's2',
                description: 'skip to clone all projects',
                type: 'boolean',
            },
            {
                name: 'skip-build-projects',
                alias: 's3',
                description: 'skip to build dockerfile of all projects',
                type: 'boolean',
            },
            {
                name: 'remove-containers',
                alias: 'rc',
                description: 'remove containers when stoping services',
                type: 'boolean',
            }
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>load all configs
        this.configs = await loadAllConfig();
        // =>check ssl files exist
        if (this.configs.ssl_enabled && (!fs.existsSync(path.join(this.configs.ssl_path, 'cert.crt')) || !fs.existsSync(path.join(this.configs.ssl_path, 'cert.key')))) {
            LOG.info('generating ssl files ...');
            let res12 = await OS.shell(`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${path.join(this.configs.ssl_path, 'cert.key')} -out ${path.join(this.configs.ssl_path, 'cert.crt')}`, this.configs.ssl_path);
            if (res12 !== 0) {
                return false;
            }
            await OS.shell(`sudo chmod -R 777 ${this.configs.ssl_path}`);
        }

        // =>copy ssl folder to .dist
        OS.copyDirectory(this.configs.ssl_path, path.join(this.configs.dist_path, 'ssl'));
        // =>get git username, if not
        if (!this.configs.git_username || this.configs.git_username.length === 0) {
            this.configs.git_username = await IN.input('Enter git username:');
            await ENV.save('git_username', this.configs.git_username);
        }
        // =>get git password, if not
        if (!this.configs.git_password || this.configs.git_password.length === 0) {
            this.configs.git_password = await IN.password('Enter git password:');
            await ENV.save('git_password', this.configs.git_password);
        }
        // =>disable ssl verify
        await OS.exec(`git config --global http.sslVerify false`);
        // =>remove unused docker images
        if (!this.hasArgv('skip-remove-unused-images')) {
            await LOG.info('removing unused docker images...');
            await OS.shell(`sudo docker rmi $(sudo docker images --filter "dangling=true" -q --no-trunc)
            `);
            await OS.shell(`sudo docker rmi $(sudo docker images | grep "^<none" | awk '{print $3}')
            `)
        }
        // clone projects in dist folder
        await this.cloneSubDomainProjects();

        // =>create hook dirs
        let envHooksPath = path.join(this.configs.env_path, 'hooks');
        let distHooksPath = path.join(this.configs.dist_path, 'hooks');
        let hookDirs = ['mysql', 'nginx', 'nginx/conf', 'caddy'];
        for (const d of hookDirs) {
            fs.mkdirSync(path.join(this.configs.dist_path, 'hooks', d), { recursive: true });
        }
        // =>render hooks
        let hookFiles = [
            // 'mysql/init.sql',
            'nginx/uwsgi_params',
            'nginx/conf/nginx.conf',
            'caddy/Caddyfile',
        ];
        for (const f of hookFiles) {
            await TEM.saveRenderFile(path.join(envHooksPath, f), path.dirname(path.join(distHooksPath, f)), { data: this.configs, noCache: true });
        }
        // =>normalize dbs
        await this.normalizeDatabases();
        // =>render docker compose
        await TEM.saveRenderFile(path.join(this.configs.env_path, 'docker-compose.yml'), path.join(this.configs.dist_path), { data: this.configs, noCache: true });
        // =>iterate projects
        for (const subdomain of loadSubDomains(this.configs)) {
            let clonePath = path.join(this.configs.dist_path, 'clones', subdomain.name);
            // =>run 'beforeBuild' function
            await this.runProjectConfigsJsFile(subdomain.name, 'beforeBuild');
            // =>build docker file
            if (!this.hasArgv('skip-build-projects')) {
                LOG.info(`building Dockerfile of ${subdomain.name} ...`);
                await OS.shell(`sudo docker build -t ${this.configs.project_name}_${subdomain.name} --network=host -f ${this.configs.dockerfiles_path}/${subdomain.name}_Dockerfile .`, clonePath);
            }
        }
        // =>stop docker composes
        await stopContainers(undefined, this.hasArgv('remove-containers'), this.configs);
        // =>build docker composes
        LOG.info('Running services...');
        if (await OS.shell(`${this.configs.docker_compose_command} up --remove-orphans -d`, this.configs.dist_path) !== 0) {
            return false;
        }

        // =>iterate projects
        for (const subdomain of loadSubDomains(this.configs)) {
            let clonePath = path.join(this.configs.dist_path, 'clones', subdomain.name);
            // =>render app entrypoint
            if (fs.existsSync(path.join(clonePath, 'docker_entrypoint.sh'))) {
                await TEM.saveRenderFile(path.join(clonePath, 'docker_entrypoint.sh'), path.join(clonePath), { data: this.configs, noCache: true });
            }
            // =>run 'finish' function
            await this.runProjectConfigsJsFile(subdomain.name, 'finish');

        }

        LOG.success(`You must set '${this.configs.domain_name}' and the other sub domains on '/etc/hosts' file.\nYou can see project on http${this.configs.ssl_enabled ? 's' : ''}://${this.configs.domain_name}`);

        return true;
    }
    /**************************** */
    async runProjectConfigsJsFile(name: string, functionName = 'init') {
        if (this.projectConfigsJsFiles[name] && this.projectConfigsJsFiles[name][functionName]) {
            let res2 = await this.projectConfigsJsFiles[name][functionName](this.configs, {
                git: GIT,
                logs: LOG,
                os: OS,
            }, this.getArgv);
            if (typeof res2 === 'object') {
                this.configs = res2;
            }
            else if (res2 === false) {
                process.exit(1);
                return false;
            }
        }
        return true;
    }
    /**************************** */
    async cloneSubDomainProjects() {
        for (const subdomain of loadSubDomains(this.configs)) {
            // =>normalize sub domain
            if (!subdomain.port) subdomain.port = 80;
            if (!subdomain.exposePort) subdomain.exposePort = subdomain.port;
            if (!subdomain.depends) subdomain.depends = [];
            if (subdomain.envs) {
                subdomain.__hasEnvs = true;
            }
            // clone project in dist folder
            let clonePath = path.join(this.configs.dist_path, 'clones', subdomain.name);
            if (!this.hasArgv('skip-clone-projects')) {
                await OS.rmdir(clonePath);
                fs.mkdirSync(clonePath, { recursive: true });
                LOG.info(`cloning ${subdomain.name} project...`);
                let res = await GIT.clone({
                    cloneUrl: subdomain.cloneUrl,
                    branch: subdomain.branch ?? 'master',
                    depth: 1,
                    username: this.configs.git_username,
                    password: this.configs.git_password,
                }, clonePath);
                LOG.log(res.stderr);
                if (res.code !== 0) return false;
                // =>move from clone branch dir to root dir
                await OS.copyDirectory(path.join(clonePath, subdomain.branch), clonePath);
                await OS.rmdir(path.join(clonePath, subdomain.branch));
            }
            // =>run 'prod.config.js' if exist
            if (fs.existsSync(path.join(clonePath, 'prod.config.js'))) {
                this.projectConfigsJsFiles[subdomain.name] = await import(path.join(clonePath, 'prod.config.js'));
                await this.runProjectConfigsJsFile(subdomain.name, 'init');
            }
            // =>render docker file of project
            let renderDockerfile = await TEM.renderFile(path.join(clonePath, 'Dockerfile'), { data: this.configs, noCache: true });
            fs.writeFileSync(path.join(this.configs.dockerfiles_path, `${subdomain.name}_Dockerfile`), renderDockerfile.data);
        }
    }
    /**************************** */
    async normalizeDatabases() {
        for (const db of (this.configs.databases as Database[])) {
            if (!db.timezone) {
                db.timezone = 'UTC';
            }
            // mysql db
            if (db.type === 'mysql') {
                db.command = `mysqld --default-authentication-plugin=mysql_native_password --character-set-server=utf8 --collation-server=utf8_general_ci`;
                if (!db.image) db.image = 'mysql:8.0';
                db.realPort = 3306;
                if (!db.volumes) {
                    db.volumes = [
                        './data/mysql_data:/var/lib/mysql',
                        './data/mysql:/docker-entrypoint-initdb.d/:ro'
                    ];
                }
                db.envs = {
                    MYSQL_ROOT_PASSWORD: db.root_password,
                    MYSQL_DATABASE: db.dbname,
                    HOSTNAME: db.name,
                    MYSQL_TCP_PORT: db.port,
                };
                db.healthcheck = {
                    test: `[ "CMD", "mysqladmin", "ping", "-h", "localhost" ]`,
                    timeout: 1,
                    retries: 30,
                };
            }
            // redis
            else if (db.type === 'redis') {
                if (!db.image) {
                    db.image = 'redis:alpine';
                }
                db.realPort = 6379;
                db.healthcheck = {
                    test: `[ "CMD", "redis-cli", "--raw", "incr", "ping" ]`,
                    timeout: 1,
                    retries: 30,
                }
            }
            // mongo
            else if (db.type === 'mongo') {
                if (!db.image) {
                    db.image = 'mongo:latest';
                }
                db.realPort = 27017;
                db.healthcheck = {
                    test: `["CMD","mongo", "--eval", "db.adminCommand('ping')"]`,
                    timeout: 1,
                    retries: 30,
                };
                if (!db.volumes) {
                    db.volumes = [
                        './data/mongo_db:/data/db'
                    ];
                }

                db.envs = {
                    TZ: db.timezone,
                    MONGO_INITDB_ROOT_USERNAME: 'root',
                    MONGO_INITDB_ROOT_PASSWORD: db.root_password,
                    MONGO_INITDB_DATABASE: db.dbname,
                };
            }
            if (db.envs) {
                db.__has_envs = true;
            }
            if (!db.volumes) {
                db.volumes = [];
            }
        }
    }

} 