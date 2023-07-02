import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { _runProjectConfigsJsFile, cloneProjectServicesByConfigs, findProfileByName, loadAllConfig, makeServiceImageName, normalizeServicesByConfigs, stopContainers } from '../common';
import { CommandArgvName, CommandName, ProjectConfigs, ServiceConfigsFunctionName, Storage } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as LOG from '@dat/lib/log';
import * as IN from '@dat/lib/input';
import * as ENV from '@dat/lib/env';
import * as OS from '@dat/lib/os';
import * as GIT from '@dat/lib/git';
import * as TEM from '@dat/lib/template';



@cliCommandItem()

export class BuildCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'build';
    }

    get alias(): string {
        return 'b';
    }

    get description(): string {
        return 'build service images'
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
                name: 'service',
                alias: 's',
                description: 'build specific service images',
                type: 'string',
            },
            {
                name: 'no-cache',
                alias: 'nc',
                description: 'disable cache for build',
                type: 'boolean',
            },


        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>find profile
        const profile = await findProfileByName(this.getArgv('profile'));
        if (!profile) {
            LOG.error('no specific profile');
            return false;
        }
        // =>load all configs
        const env = this.getArgv('environment', profile.defaultEnv ?? 'prod');
        this.configs = await loadAllConfig(profile.path, env);
        // LOG.info(`Stopping services ....`);
        let serviceNames = [];
        if (this.hasArgv('service')) {
            let serviceName = this.getArgv('service');
            // await makeDockerServiceNameAsValid(this.getArgv('service'), this.configs);
            if (this.configs.services[serviceName]) {
                serviceNames.push(serviceName);
            }
        } else {
            // =>load active service names
            for (const key of Object.keys(this.configs.services)) {
                if (this.configs.services[key].disabled) continue;
                serviceNames.push(key);
            }
        }
        // =>normalize services
        await normalizeServicesByConfigs(serviceNames, profile, this.configs);
        // clone projects in dist folder
        await cloneProjectServicesByConfigs(serviceNames, profile, this.configs);

        // =>iterate services to build them
        for (const serviceName of serviceNames) {
            let service = this.configs.services[serviceName];
            let clonePath = path.join(this.configs._env.dist_path, 'clones', serviceName);
            // =>check if allowed to clone project
            // =>run 'beforeBuild' function
            await this.runProjectConfigsJsFile(serviceName, 'beforeBuild');
            // =>build docker file
            LOG.info(`building Dockerfile of ${serviceName} ...`);
            await OS.shell(`sudo ${service.docker.build_kit_enabled ? 'DOCKER_BUILDKIT=1' : ''} docker build -t ${makeServiceImageName(serviceName, this.configs)} ${this.hasArgv('no-cache') ? '--no-cache' : ''} --network=host -f ${this.configs._env.dockerfiles_path}/${serviceName}_Dockerfile .`, clonePath);
        }

        return true;
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


} 