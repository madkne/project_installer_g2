import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { cloneProjectServicesByConfigs, findProfileByName, loadAllConfig, normalizeServicesByConfigs, stopContainers } from '../common';
import { CommandArgvName, CommandName, ProjectConfigs, Storage } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as LOG from '@dat/lib/log';
import * as IN from '@dat/lib/input';
import * as ENV from '@dat/lib/env';
import * as OS from '@dat/lib/os';
import * as GIT from '@dat/lib/git';
import * as TEM from '@dat/lib/template';



@cliCommandItem()

export class PushCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'push';
    }

    get alias(): string {
        return 'pu';
    }

    get description(): string {
        return 'build and push some base docker images'
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
                name: 'docker-project',
                alias: 'dp',
                description: 'docker project base path like: harbor.company.com/project',
                type: 'string',
                defaultValue: "docker.io"
            },
            {
                name: 'service',
                alias: 's',
                description: 'push base images of specific service, not all services',
                type: 'string',
            }
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
            // =>run 'beforeBuild' function
            // await this.runProjectConfigsJsFile(serviceName, 'beforeBuild');
            if (!this.configs.services[serviceName]?.docker?.push) this.configs.services[serviceName].docker.push = {};
            // =>iterate push items
            const pushDockers = this.configs.services[serviceName].docker.push;
            for (const key of Object.keys(this.configs.services[serviceName].docker.push)) {
                const serviceCustomPath = path.join(profile.path, 'services', serviceName);
                // =>build docker file
                LOG.info(`building base Dockerfile of ${serviceName} named '${pushDockers[key]}' ...`);
                await OS.shell(`sudo ${service.docker.build_kit_enabled ? 'DOCKER_BUILDKIT=1' : ''} docker build -t ${pushDockers[key]}  --network=host -f ${serviceCustomPath}/${key} .`, clonePath);
                // =>pushing to docker registry
                LOG.info(`pushing base Docker image '${pushDockers[key]}' ...`);
                await OS.shell(`sudo docker login ${this.configs.project?.docker_push_host ?? 'docker.io'}`);
                await OS.shell(`sudo docker tag ${pushDockers[key]} ${this.configs.project.docker_project_base_path ?? ''}/${pushDockers[key]}`);

                await OS.shell(`sudo docker push ${this.configs.project.docker_project_base_path ?? ''}/${pushDockers[key]}`);

            }
        }

        return true;
    }



} 