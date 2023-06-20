import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { _runProjectConfigsJsFile, checkContainerHealthy, checkExistDockerContainerByName, clone, cloneProjectServicesByConfigs, convertNameToContainerName, copyExistFile, findProfileByName, generateServiceContainerStaticIP, generateSSL, getContainerIP, loadAllConfig, loadProfiles, makeDockerServiceName, makeDockerStorageName, makeServiceImageName, NginxErrorPageCodes, normalizeServicesByConfigs, parseHumanTimeToCronFormat, runDockerContainer, ServicesNetworkSubnetStartOf, setContainersHealthy, stopContainers } from '../common';
import { CommandArgvName, CommandName, Storage, Profile, Service, ProjectConfigs, ServiceConfigsFunctionName } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as cron from 'node-cron';
import * as LOG from '@dat/lib/log';
import * as IN from '@dat/lib/input';
import * as ENV from '@dat/lib/env';
import * as OS from '@dat/lib/os';
import * as GIT from '@dat/lib/git';
import * as TEM from '@dat/lib/template';
import { normalizeMongo, normalizeMysql, normalizeRedis } from '../storages';



@cliCommandItem()

export class InstallCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};
    updatingServer = false;
    profile: Profile;
    serviceNames: string[] = [];

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
                name: 'profile',
                alias: 'p',
                description: 'use configs of specific profile',
                type: 'string',
            },
            {
                name: 'environment',
                alias: 'env',
                description: 'set specific environment',
                type: 'string',
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
                name: 'skip-caching-build',
                alias: 's4',
                description: 'skip to caching build dockerfile of all or specific projects (like * or app1,app2)',
                type: 'string',
            },
            {
                name: 'skip-updating-server-log',
                alias: 's5',
                description: 'skip to wall updating server message',
                type: 'string',
            },
            {
                name: 'remove-containers',
                alias: 'rc',
                description: 'remove containers when stopping services',
                type: 'boolean',
            }
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>find profile
        this.profile = await findProfileByName(this.getArgv('profile'));
        if (!this.profile) {
            LOG.error('no specific profile');
            return false;
        }
        // =>load all configs
        const env = this.getArgv('environment', this.profile.defaultEnv ?? 'prod');
        this.configs = await loadAllConfig(this.profile.path, env);
        LOG.info(`install in '${env}' mode ...`);
        // =>load active service names
        this.serviceNames = [];
        for (const key of Object.keys(this.configs.services)) {
            if (this.configs.services[key].disabled) continue;
            this.serviceNames.push(key);
        }
        // =>if ssl enabled
        if (this.configs.domain.ssl_enabled) {
            await generateSSL(this.configs);
        }
        // =>get git username, if not
        if (!this.configs._env.git_username || this.configs._env.git_username.length === 0) {
            this.configs._env.git_username = await IN.input('Enter git username:');
            await ENV.save('git_username', this.configs._env.git_username);
        }
        // =>get git password, if not
        if (!this.configs._env.git_password || this.configs._env.git_password.length === 0) {
            this.configs._env.git_password = await IN.password('Enter git password:');
            await ENV.save('git_password', this.configs._env.git_password);
        }
        // =>disable ssl verify
        await OS.exec(`git config --global http.sslVerify false`);
        // =>remove unused docker images
        if (!this.hasArgv('skip-remove-unused-images')) {
            await LOG.info('removing unused docker images...');
            if (await OS.checkCommand('sudo docker images --filter "dangling=true" -q --no-trunc')) {
                await OS.shell(`sudo docker rmi $(sudo docker images --filter "dangling=true" -q --no-trunc)
            `);
            }
            if (await OS.checkCommand(`sudo docker images | grep "^<none" | awk '{print $3}'`)) {
                await OS.shell(`sudo docker rmi $(sudo docker images | grep "^<none" | awk '{print $3}')
            `);
            }
        }
        // =>create static networks
        if (this.configs.project.ip_mapping === 'static') {
            await OS.exec(`sudo docker network rm project_services`);
            // =>create services static network
            await OS.shell(`sudo docker network create project_services --subnet="${ServicesNetworkSubnetStartOf}.0/24"`);
        }
        // =>normalize services
        await this.normalizeServices();
        // clone projects in dist folder
        await this.cloneProjectServices();

        // =>create hook dirs

        let hookDirs = ['mysql', 'nginx', 'nginx/conf'];
        for (const d of hookDirs) {
            fs.mkdirSync(path.join(this.configs._env.dist_path, 'hooks', d), { recursive: true });
        }
        // =>render hooks
        let hookFiles = [
            'mysql/my.cnf',
            'nginx/uwsgi_params',
            'nginx/nginx.conf',
            // 'nginx/conf/servers.conf',
        ];
        for (const f of hookFiles) {
            await TEM.saveRenderFile(path.join(this.configs._env.env_hooks_path, f), path.dirname(path.join(this.configs._env.dist_hooks_path, f)), { data: this.configs, noCache: true });
        }
        // =>render custom files
        let customFiles = fs.readdirSync(path.join(this.profile.path, 'custom'), { withFileTypes: true });
        fs.mkdirSync(path.join(this.configs._env.dist_path, 'custom'), { recursive: true });
        for (const f of customFiles) {
            await TEM.saveRenderFile(path.join(this.profile.path, 'custom', f.name), path.join(this.configs._env.dist_path, 'custom'), { data: this.configs, noCache: true });
        }
        // =>if nginx is down
        if (!await checkExistDockerContainerByName(makeDockerServiceName('nginx', this.configs))) {
            await this.restartNginx();
        }
        // =>normalize dbs
        await this.normalizeStorages();

        let skipBuildProjects = [];
        let noCacheBuildProjects = [];
        if (this.hasArgv('skip-build-projects')) {
            skipBuildProjects = this.extractServiceNames('skip-build-projects');
        }
        if (this.hasArgv('skip-caching-build')) {
            noCacheBuildProjects = this.extractServiceNames('skip-caching-build');
        }
        // console.log(JSON.stringify(this.configs, null, 2))
        // =>iterate services to build them
        for (const serviceName of this.serviceNames) {
            let service = this.configs.services[serviceName];
            let clonePath = path.join(this.configs._env.dist_path, 'clones', serviceName);
            // =>check if allowed to clone project
            if (!skipBuildProjects.includes(serviceName)) {
                // =>run 'beforeBuild' function
                await this.runProjectConfigsJsFile(serviceName, 'beforeBuild');
                // =>build docker file
                LOG.info(`building Dockerfile of ${serviceName} ...`);
                await OS.shell(`sudo ${service.docker.build_kit_enabled ? 'DOCKER_BUILDKIT=1' : ''} docker build -t ${makeServiceImageName(serviceName, this.configs)} ${noCacheBuildProjects.includes(serviceName) ? '--no-cache' : ''} --network=host -f ${this.configs._env.dockerfiles_path}/${serviceName}_Dockerfile .`, clonePath);
            }
        }
        this.updatingServer = true;
        // let lastUpdatingServerLog: number;
        // if (!this.hasArgv('skip-updating-server-log')) {
        //     let updatingInterval = setInterval(() => {
        //         if (!this.updatingServer) {
        //             clearInterval(updatingInterval);
        //             return;
        //         }
        //         if (lastUpdatingServerLog && new Date().getTime() - lastUpdatingServerLog < 3000) return;
        //         lastUpdatingServerLog = new Date().getTime();
        //         OS.commandResult(`wall "server '${this.configs.project_name}' is updating....\n Please Wait!"`);
        //     }, 10);
        // }
        // =>stop service docker containers 
        await stopContainers(this.configs, this.serviceNames, true);
        // =>stop storages, if 'rc' flag
        if (this.hasArgv('remove-containers')) {
            await stopContainers(this.configs, Object.keys(this.configs.storages), true, 'storage');
            await this.restartNginx();
        }
        // =>up storages docker containers
        LOG.info('Running storages...');
        for (const name of Object.keys(this.configs.storages)) {
            let storage = this.configs.storages[name];
            let containerName = makeDockerStorageName(name, this.configs);
            // =>check is run before
            if (await checkExistDockerContainerByName(containerName)) continue;
            LOG.info(`Running '${name}' storage...`);
            if (await runDockerContainer(this.configs, {
                name: containerName,
                image: storage.image,
                hostname: name,
                ports: [
                    {
                        host: storage.realPort,
                        container: storage.realPort,
                        host_ip: storage.allow_public ? '0.0.0.0' : '127.0.0.1',
                    },
                ],
                healthCheck: storage.health_check,
                volumes: storage.volumes,
                envs: storage.envs,
                capAdd: storage['capAdd'],
                argvs: storage.argvs,
                ip: storage._ip,
                network: storage._network,
            }) !== 0) {
                return false;
            }
            // =>check health status of container
            this.configs.storages[name]._health_status = await checkContainerHealthy(this.configs, containerName);
        }
        // =>up service docker containers
        LOG.info('Running services...');
        let processingServices = clone<string[]>(this.serviceNames);
        while (processingServices.length > 0) {
            const name = processingServices[0];
            let service = this.configs.services[name];
            let containerName = makeDockerServiceName(name, this.configs);
            LOG.info(`Running '${name}' service...`);
            // =>check depends service
            if (service.docker.depends) {
                this.configs = await setContainersHealthy(this.configs);
                let healthCount = 0;
                let unhealthyDepends = service.docker.depends;
                for (const dep of service.docker.depends) {
                    // =>find depend in storages
                    if (Object.keys(this.configs.storages).includes(dep) && this.configs.storages[dep]._health_status === 'healthy') {
                        healthCount++;
                        unhealthyDepends.splice(unhealthyDepends.indexOf(dep), 1);
                    }
                    // =>find depend in services
                    else if (Object.keys(this.configs.services).includes(dep) && this.configs.services[dep].docker._health_status === 'healthy') {
                        healthCount++;
                        unhealthyDepends.splice(unhealthyDepends.indexOf(dep), 1);
                    }
                }
                if (healthCount < service.docker.depends.length) {
                    if (this.configs.project.debug) {
                        console.log(`service depends bad healths: ${healthCount} of ${service.docker.depends.length} (unhealthy depends: ${unhealthyDepends.join(', ')})`);
                    }
                    // console.log(JSON.stringify(this.configs, null, 2))
                    // =>move service to last of processing
                    processingServices.splice(processingServices.indexOf(name), 1);
                    processingServices.push(name);
                    // LOG.warning(``)
                    continue;
                }
            }
            if (await runDockerContainer(this.configs, {
                name: containerName,
                image: makeServiceImageName(name, this.configs),
                hostname: name + '_service',
                ports: [
                    {
                        host: service.docker._host_port,
                        container: service.docker._expose_port,
                    }
                ],
                volumes: service.docker.volumes,
                mounts: service.docker.mounts,
                envs: service.docker.envs,
                links: service.docker.links,
                hosts: service.docker.hosts,
                pull: 'never',
                ip: service.docker.ip,
                network: service.docker._network,
            }) !== 0) {
                return false;
            }
            // =>check health status of container
            this.configs.services[name].docker._health_status = await checkContainerHealthy(this.configs, containerName);
            // =>get service ip
            service.docker._ip = await getContainerIP(containerName);
            // =>update nginx
            await this.updateNginxConfigs();
            // =>remove service from processing
            processingServices.splice(processingServices.indexOf(name), 1);

        }
        if (!await this.restartNginx()) {
            LOG.warning('nginx restarting failed! Please check it.');
            // return false;
        }
        if (this.configs.project.debug) {
            console.log(JSON.stringify(this.configs, null, 2));
        }
        // =>iterate projects
        for (const name of this.serviceNames) {
            let clonePath = path.join(this.configs._env.dist_path, 'clones', name);
            // =>render app entrypoint
            if (fs.existsSync(path.join(clonePath, 'docker_entrypoint.sh'))) {
                await TEM.saveRenderFile(path.join(clonePath, 'docker_entrypoint.sh'), path.join(clonePath), { data: this.configs, noCache: true });
            }
            // =>run 'finish' function
            await this.runProjectConfigsJsFile(name, 'finish');

        }
        // =>update backups
        if (this.configs.backup) {
            LOG.info('Updating Backup Plans...');
            await this.updateBackupPlans();
        }

        this.updatingServer = false;
        LOG.success(`You must set '${this.configs.domain.name}' and the other sub domains on '/etc/hosts' file.\nYou can see project on http${this.configs.domain.ssl_enabled ? 's' : ''}://${this.configs.domain.name}`);

        return true;
    }
    /**************************** */
    async collectNginxStaticFiles() {
        const nginxStaticsPath = path.join(this.configs._env.dist_path, 'data', 'nginx', 'static');
        // const customPath = path.join(this.profile.path, 'custom');
        // const envStaticPath = path.join(this.configs._env.env_path, 'static');
        fs.mkdirSync(nginxStaticsPath, { recursive: true });
        for (const srv of this.serviceNames) {
            // =>copy error html files
            for (const name of Object.keys(this.configs.services[srv].web._abs_error_pages)) {
                // =>copy 50x.html file
                fs.copyFileSync(this.configs.services[srv].web._abs_error_pages[name], path.join(nginxStaticsPath, name + '.html'));
                this.configs.services[srv].web.error_pages[name] = name + '.html';
            }

        }
    }
    /**************************** */
    async runProjectConfigsJsFile(name: string, functionName: ServiceConfigsFunctionName = 'init') {
        let res1 = await _runProjectConfigsJsFile(name, functionName, this.projectConfigsJsFiles, this.configs, this.getArgv);
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
    async cloneProjectServices() {
        let serviceNames = Object.keys(this.configs.services);
        let skipCloneProjects = [];
        if (this.hasArgv('skip-clone-projects')) {
            skipCloneProjects = this.extractServiceNames('skip-clone-projects');
        }
        for (const srv of skipCloneProjects) {
            // =>check if allowed to clone project
            serviceNames.splice(serviceNames.indexOf(srv), 1);
        }
        // console.log(serviceNames, skipCloneProjects)
        let res = await cloneProjectServicesByConfigs(serviceNames, this.profile, this.configs);
        this.projectConfigsJsFiles = res.projectConfigsJsFiles;
    }
    /**************************** */
    async normalizeStorages() {
        for (const storageName of Object.keys(this.configs.storages)) {
            let db = this.configs.storages[storageName];
            // =>set static ip
            if (this.configs.project.ip_mapping === 'static') {
                db._ip = await generateServiceContainerStaticIP(this.configs);
                db._network = 'project_services';
            }
            if (!db.timezone) {
                db.timezone = 'UTC';
            }
            // mysql db
            if (db.type === 'mysql') {
                db = await normalizeMysql(this.configs, storageName, db);
            }
            // redis db
            if (db.type === 'redis') {
                db = await normalizeRedis(this.configs, storageName, db);
            }
            // mongo db
            if (db.type === 'mongo') {
                db = await normalizeMongo(this.configs, storageName, db);
            }

            if (db.envs) {
                db.__has_envs = true;
            }
            if (!db.volumes) {
                db.volumes = [];
            }
        }
    }
    /**************************** */
    async normalizeServices() {
        return await normalizeServicesByConfigs(Object.keys(this.configs.services), this.profile, this.configs);
    }
    /**************************** */
    extractServiceNames(commandName: CommandArgvName) {
        let allServiceNames = Object.keys(this.configs.services);
        let serviceNames = this.getArgv(commandName) ? this.getArgv(commandName).split(',').map(i => i.trim()).filter(i => allServiceNames.includes(i)) : allServiceNames;

        return serviceNames;
    }
    /**************************** */
    async restartNginx() {
        if (await checkExistDockerContainerByName(makeDockerServiceName('nginx', this.configs))) {
            await stopContainers(this.configs, ['nginx'], true, 'web');
        }
        // =>collect nginx static files
        await this.collectNginxStaticFiles();
        await this.updateNginxConfigs(false);
        // =>rerender nginx server conf
        await TEM.saveRenderFile(path.join(this.configs._env.env_hooks_path, 'nginx/conf/servers.conf'), path.dirname(path.join(this.configs._env.dist_hooks_path, 'nginx/conf/servers.conf')), { data: this.configs, noCache: true });
        // =>up nginx
        let webServerPorts = [{ host: 80, container: 80 }];
        const nginxContainerName = makeDockerServiceName('nginx', this.configs);
        if (!await checkExistDockerContainerByName(nginxContainerName)) {
            let nginxVolumes = [
                './hooks/nginx/nginx.conf:/etc/nginx/nginx.conf:ro',
                './hooks/nginx/conf:/etc/nginx/conf.d',
                './hooks/nginx/uwsgi_params:/etc/nginx/uwsgi_params',
                './data/static:/static',
                './data/media:/media',
                './data/nginx/logs:/var/log/nginx',
                './data/nginx/static:/var/static',
            ];
            // =>if ssl enabled
            if (this.configs.domain.ssl_enabled) {
                nginxVolumes.push(`../ssl/${this.configs.project._env}:/etc/nginx/certs`);
                webServerPorts.push({ host: 443, container: 443 });
            }

            if (await runDockerContainer(this.configs, {
                name: nginxContainerName,
                image: this.configs.project.docker_register + '/nginx:stable',
                volumes: nginxVolumes,
                // networkAlias: this.configs.domain.name,
                // links: this.serviceNames.map(i => makeDockerServiceName(i, this.configs)),
                ports: webServerPorts,
                network: 'host',
            }) !== 0) {
                return false;
            }
        }
    }
    /**************************** */
    async updateNginxConfigs(restartContainer = true) {
        // =>rerender nginx server conf
        await TEM.saveRenderFile(path.join(this.configs._env.env_hooks_path, 'nginx/conf/servers.conf'), path.dirname(path.join(this.configs._env.dist_hooks_path, 'nginx/conf/servers.conf')), { data: this.configs, noCache: true });
        if (restartContainer) {
            try {
                await OS.exec(`sudo docker restart ${makeDockerServiceName('nginx', this.configs)}`)
            } catch (e) { }
        }
    }
    /**************************** */
    async updateBackupPlans() {
        if (!this.configs.backup.plans) this.configs.backup.plans = {};
        // =>reset crontab
        await OS.shell(`crontab -l > mycron;echo "" > mycron;crontab mycron;rm mycron`);
        // =>remove backup scripts
        await OS.rmdir(this.configs._env.backups_path);
        fs.mkdirSync(this.configs._env.backups_path, { recursive: true });
        // =>iterate plans
        for (const key in this.configs.backup.plans) {
            const plan = this.configs.backup.plans[key];
            let planScriptPath = '';
            if (!plan.remote_path) plan.remote_path = '/';
            // =>if storage plan
            if (plan.storage_name) {
                // =>if mysql storage
                if (this.configs.storages[plan.storage_name].type === 'mysql') {
                    // =>render mysql script
                    let renderedScript = await TEM.renderFile(path.join(this.configs._env.env_path, 'backups', 'mysql.sh'), {
                        data: {
                            plan,
                            settings: this.configs.backup.settings,
                            mysql: this.configs.storages[plan.storage_name],
                            mysql_image_name: makeDockerStorageName(plan.storage_name, this.configs),
                            local_backups_dir: path.join(this.configs._env.backups_path, 'backup_files'),
                        }, noCache: true
                    });
                    // =>write script file
                    planScriptPath = path.join(this.configs._env.backups_path, key + '_' + Math.ceil(Math.random() * 1000) + '.sh');
                    fs.writeFileSync(planScriptPath, renderedScript.data);

                }
            }
            if (!plan.crontab_time) plan.crontab_time = "0 */12 * * *";
            // if (plan.human_time) {
            //     plan.crontab_time = parseHumanTimeToCronFormat(plan.human_time);
            // }TODO:
            const crontabLine = `${plan.crontab_time} /bin/bash ${planScriptPath}`;
            // cron.schedule(`${plan.crontab_time} /bin/bash ${planScriptPath}`,)
            await OS.shell(`crontab -l > mycron;echo "${crontabLine}" >> mycron;crontab mycron;rm mycron
            `);
        }
    }
} 