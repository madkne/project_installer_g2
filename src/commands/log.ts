import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { loadAllConfig, loadSubDomains, makeDockerServiceNameAsValid, stopContainers } from '../common';
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

export class LogCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ConfigsObject;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'log';
    }

    get alias(): string {
        return 'l';
    }

    get description(): string {
        return 'display logs of a service'
    }

    get argvs(): CommandArgvItem<CommandArgvName>[] {
        return [
            {
                name: 'follow',
                alias: 'f',
                description: 'Follow log output',
                type: 'boolean',
            },
            {
                name: 'service',
                alias: 's',
                description: 'show log of specific service, not all services',
                type: 'string',
            }
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        // =>load all configs
        this.configs = await loadAllConfig(this.getArgv('environment'));
        // LOG.info(`Stopping services ....`);
        let serviceName: string;
        if (this.hasArgv('service')) {
            serviceName = this.getArgv('service');
            // await makeDockerServiceNameAsValid(this.getArgv('service'), this.configs);
        }
        // =>show log docker composes
        const command = `${this.configs.docker_compose_command} logs ${this.hasArgv('follow') ? '-f' : ''} ${this.hasArgv('service') ? serviceName : ''}`;
        await OS.shell(command, this.configs.dist_path);

        return true;
    }



} 