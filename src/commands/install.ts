import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { clone, generateSSL, loadAllConfig, loadSubDomains, stopContainers } from '../common';
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
    updatingServer = false;

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
                name: 'environment',
                alias: 'env',
                description: 'set specific environment',
                type: 'string',
                defaultValue: 'prod',
            },
            {
                name: 'skip-remove-unused-images',
                alias: 's1',
                description: 'skip remove unused images',
                type: 'boolean',
            },
            {
                name: 'skip-clone-projects',
                alias: 's2',
                description: 'skip to clone all or specific projects (like * or app1,app2)',
                type: 'string',
            },
            {
                name: 'skip-build-projects',
                alias: 's3',
                description: 'skip to build dockerfile of all or specific projects (like * or app1,app2)',
                type: 'string',
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
        this.configs = await loadAllConfig(this.getArgv('environment'));
        LOG.info(`install in '${this.getArgv('environment')}' mode ...`);
        // =>if ssl enabled
        if (this.configs.ssl_enabled) {
            await generateSSL(this.configs);
        }
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
            'mysql/init.sql',
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
        let skipBuildProjects = [];
        if (this.hasArgv('skip-build-projects')) {
            skipBuildProjects = this.getArgv('skip-build-projects') ? this.getArgv('skip-build-projects').split(',') : ['*'];
        }

        // =>iterate projects
        for (const subdomain of loadSubDomains(this.configs)) {
            let clonePath = path.join(this.configs.dist_path, 'clones', subdomain.name);
            // =>check if allowed to clone project
            if (!skipBuildProjects.includes('*') && !skipBuildProjects.includes(subdomain.name)) {
                // =>run 'beforeBuild' function
                await this.runProjectConfigsJsFile(subdomain.name, 'beforeBuild');
                // =>build docker file
                LOG.info(`building Dockerfile of ${subdomain.name} ...`);
                await OS.shell(`sudo docker build -t ${this.configs.project_name}_${subdomain.name} --network=host -f ${this.configs.dockerfiles_path}/${subdomain.name}_Dockerfile .`, clonePath);
            }
        }
        this.updatingServer = true;
        let updatingInterval = setInterval(() => {
            if (!this.updatingServer) {
                clearInterval(updatingInterval);
                return;
            }
            OS.commandResult(`wall "server '${this.configs.project_name}' is updating....\n Please Wait!"`);
        }, 1000);
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
        this.updatingServer = false;
        LOG.success(`You must set '${this.configs.domain_name}' and the other sub domains on '/etc/hosts' file.\nYou can see project on http${this.configs.ssl_enabled ? 's' : ''}://${this.configs.domain_name}`);

        return true;
    }
    /**************************** */
    async runProjectConfigsJsFile(name: string, functionName = 'init') {
        let res1 = await this._runProjectConfigsJsFile(name, functionName);
        if (res1 !== undefined) {
            if (typeof res1 === 'object') {
                this.configs = res1;
            }
            else if (res1 === false) {
                process.exit(1);
                return false;
            }
        }
        return true;
    }
    /**************************** */
    async _runProjectConfigsJsFile(name: string, functionName: string) {
        if (this.projectConfigsJsFiles[name] && this.projectConfigsJsFiles[name][functionName]) {
            let res2 = await this.projectConfigsJsFiles[name][functionName](this.configs, {
                git: GIT,
                logs: LOG,
                os: OS,
            }, this.getArgv);
            return res2;
        }
        return undefined;
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
            // =>normalize app healthcheck
            if (subdomain.healthcheck) {
                subdomain.healthcheck._test_str = `[ ${subdomain.healthcheck.test.map(i => `"${i}"`).join(', ')} ]`;
                if (!subdomain.healthcheck.retries) subdomain.healthcheck.retries = 30;
                if (!subdomain.healthcheck.timeout) subdomain.healthcheck.timeout = 1;
            }
            // =>normalize app locations
            if (subdomain.locations) {
                for (const loc of subdomain.locations) {
                    if (!loc.modifier) loc.modifier = '';
                }
            }
            // clone project in dist folder
            let clonePath = path.join(this.configs.dist_path, 'clones', subdomain.name);
            let skipCloneProjects = [];
            if (this.hasArgv('skip-clone-projects')) {
                skipCloneProjects = this.getArgv('skip-clone-projects') ? this.getArgv('skip-clone-projects').split(',') : ['*'];
            }

            // =>check if allowed to clone project
            if (!skipCloneProjects.includes('*') && !skipCloneProjects.includes(subdomain.name)) {
                await OS.rmdir(clonePath);
                fs.mkdirSync(clonePath, { recursive: true });
                LOG.info(`cloning ${subdomain.name} project...`);
                let res = await GIT.clone({
                    cloneUrl: subdomain.cloneUrl,
                    branch: subdomain.branch ?? 'master',
                    depth: 1,
                    username: this.configs.git_username,
                    password: this.configs.git_password,
                    directory: subdomain.branch,
                }, clonePath);
                LOG.log(res.stderr);
                if (res.code !== 0) return false;
                // =>move from clone branch dir to root dir
                await OS.copyDirectory(path.join(clonePath, subdomain.branch), clonePath);
                await OS.rmdir(path.join(clonePath, subdomain.branch));
            }
            // =>load 'prod.config.js' if exist
            if (fs.existsSync(path.join(clonePath, 'prod.config.js'))) {
                this.projectConfigsJsFiles[subdomain.name] = await import(path.join(clonePath, 'prod.config.js'));
            }
            // =>check if allowed to clone project
            if (!skipCloneProjects.includes('*') && !skipCloneProjects.includes(subdomain.name)) {
                // =>get compiled files
                let compiledFiles = await this._runProjectConfigsJsFile(subdomain.name, 'compileFiles');
                if (compiledFiles !== undefined && Array.isArray(compiledFiles)) {
                    for (const file of compiledFiles) {
                        // =>render app entrypoint
                        if (fs.existsSync(path.join(clonePath, file))) {
                            let data = clone(this.configs);
                            data['envs'] = subdomain.envs;
                            // =>render file of project
                            let renderFile = await TEM.renderFile(path.join(clonePath, file), { data, noCache: true });
                            fs.writeFileSync(path.join(clonePath, file), renderFile.data);
                        }
                    }
                }
                // =>run init command
                await this.runProjectConfigsJsFile(subdomain.name, 'init');

            }
            // =>render docker file of project, if exist
            if (fs.existsSync(path.join(clonePath, 'Dockerfile'))) {
                let renderDockerfile = await TEM.renderFile(path.join(clonePath, 'Dockerfile'), { data: this.configs, noCache: true });
                fs.writeFileSync(path.join(this.configs.dockerfiles_path, `${subdomain.name}_Dockerfile`), renderDockerfile.data);
            }
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
                        './data/mysql_data:/var/lib/mysql',];
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
                if (db.mysql_db_names) {
                    db.envs['MYSQL_DATABASE'] = undefined;
                    db.volumes.push("./hooks/mysql:/docker-entrypoint-initdb.d:ro");
                }
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
                    //test: `echo 'db.runCommand("ping").ok' | mongo localhost:${db.port}/${db.dbname} --quiet`,
                    timeout: 1,
                    retries: 30,
                };
                if (db.port !== 27017) {
                    db.command = `mongod --port ${db.port}`;
                    db.realPort = db.port;
                }
                if (!db.volumes) {
                    db.volumes = [
                        `./data/mongo_db/${db.name}:/data/db`
                    ];
                }

                db.envs = {
                    TZ: db.timezone,

                    MONGO_INITDB_DATABASE: db.dbname,
                };
                if (db.root_password) {
                    db.envs['MONGO_INITDB_ROOT_USERNAME'] = 'root';
                    db.envs['MONGO_INITDB_ROOT_PASSWORD'] = db.root_password;
                }
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