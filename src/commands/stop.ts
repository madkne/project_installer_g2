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

export class StopCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ConfigsObject;
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
                name: 'remove-containers',
                alias: 'rc',
                description: 'remove containers when stoping services',
                type: 'boolean',
            },
            {
                name: 'services',
                alias: 's',
                description: 'stop specific services, not all',
                type: 'string',
            }
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>load all configs
        this.configs = await loadAllConfig(this.getArgv('environment'));
        let services = undefined;
        if (this.hasArgv('services')) {
            services = this.getArgv('services').split(',');
        }
        // LOG.info(`Stopping services ....`);
        // =>stop docker composes
        await stopContainers(services, this.hasArgv('remove-containers'), this.configs);



        return true;
    }



} 