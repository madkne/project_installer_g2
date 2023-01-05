import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { findProfileByName, loadAllConfig, stopContainers } from '../common';
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

export class StopCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'stop';
    }

    get alias(): string {
        return 'stp';
    }

    get description(): string {
        return 'stop services'
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
                name: 'remove-containers',
                alias: 'rc',
                description: 'remove containers when stopping services or storages',
                type: 'boolean',
            },
            {
                name: 'services',
                alias: 's',
                description: 'stop specific services',
                type: 'string',
            },
            {
                name: 'storages',
                alias: 'st',
                description: 'stop specific storages',
                type: 'string',
            },
            {
                name: 'all-services',
                alias: 'a1',
                description: 'stop all services',
                type: 'boolean',
            },
            {
                name: 'all-storages',
                alias: 'a2',
                description: 'stop all storages',
                type: 'boolean',
            },

        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>find profile
        let profile = await findProfileByName(this.getArgv('profile'));
        if (!profile) {
            LOG.error('no specific profile');
            return false;
        }
        // =>load all configs
        const env = this.getArgv('environment', profile.defaultEnv ?? 'prod');
        this.configs = await loadAllConfig(profile.path, env);
        LOG.info(`install in '${env}' mode ...`);
        let services = [];
        let storages = [];
        if (this.hasArgv('services')) {
            services = this.getArgv('services').split(',');
        }
        if (this.hasArgv('storages')) {
            storages = this.getArgv('storages').split(',');
        }
        if (this.hasArgv('all-storages')) {
            storages = Object.keys(this.configs.storages);
        }
        if (this.hasArgv('all-services')) {
            services = Object.keys(this.configs.services);
        }
        if (services.length > 0) {
            LOG.info(`Stopping services ....`);
            // =>stop docker composes
            await stopContainers(this.configs, services, this.hasArgv('remove-containers'), 'service');
        }

        if (storages.length > 0) {
            LOG.info(`Stopping storages ....`);
            // =>stop docker composes
            await stopContainers(this.configs, storages, this.hasArgv('remove-containers'), 'storage');
        }


        return true;
    }



} 