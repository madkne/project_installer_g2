import { cliCommandItem, CliCommand, OnImplement, CommandArgvItem } from '@dat/lib/argvs';
import { loadAllConfig, loadProfiles, stopContainers } from '../common';
import { CommandArgvName, CommandName, ProjectConfigs, Storage } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as LOG from '@dat/lib/log';
import * as IN from '@dat/lib/input';
import * as ENV from '@dat/lib/env';
import * as OS from '@dat/lib/os';
import * as GIT from '@dat/lib/git';
import * as TEM from '@dat/lib/template';
import * as yml from 'js-yaml';


@cliCommandItem()

export class AddCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'add';
    }

    get alias(): string {
        return 'a';
    }

    get description(): string {
        return 'add a profile';
    }

    get argvs(): CommandArgvItem<CommandArgvName>[] {
        return [
            {
                name: 'name',
                alias: 'n',
                description: 'name of profile',
                type: 'string',
            },
            {
                name: 'path',
                alias: 'p',
                description: 'path of profile',
                type: 'string',
            },
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {
        let profileName = this.getArgv('name', 'sample');
        let profilePath = this.getArgv('path', path.join(await OS.cwd(), 'profiles', profileName));
        fs.mkdirSync(profilePath, { recursive: true });

        // =>create 'configs.base.yml' file
        fs.writeFileSync(path.join(profilePath, 'configs.base.yml'), yml.dump({
            project: {
                name: "{{project_name}}",
            },
            domain: {
                name: "{{domain_name}}",
                ssl_enabled: true,
            },
            services: {
                backend: {
                    sub_domain: '.',
                    clone: {
                        url: "{{git_base_url}}/backend",
                        branch: "dev"
                    },
                    docker: {
                        volumes: [],
                        envs: {}
                    }
                }
            },
            storages: {
                mysql: {
                    type: 'mysql',
                    port: 3306,
                    init_db_names: [
                        - "{{project_name}}_db"
                    ],
                    root_password: "tevZ2GHuCG346bmNuSPNvHAjU"
                }
            },
            variables: {
                project_name: profileName,
                domain_name: profileName + ".com",
                git_base_url: "https://github.com/" + profileName
            }
        }));

        // =>create 'configs.prod.yml' file
        fs.writeFileSync(path.join(profilePath, 'configs.prod.yml'), yml.dump({
            project: {
                extends: 'base',
            },
            services: {
                backend: {
                    clone: {
                        branch: "master"
                    },
                }
            }
        }));

        // =>create 'configs.dev.yml' file
        fs.writeFileSync(path.join(profilePath, 'configs.dev.yml'), yml.dump({
            project: {
                extends: 'base',
            },
            variables: {
                domain_name: 'dev.' + profileName + ".com",
            }
        }));
        fs.writeFileSync(path.join(profilePath, '.profile'), profileName);
        fs.writeFileSync(path.join(profilePath, '.gitignore'), `.dist`);
        fs.writeFileSync(path.join(profilePath, 'README.md'), `
# ${profileName} Project

## get started

1. install node.js 14+
2. install DAT with \`sudo npm i -g dat-tool\`
3. clone from \`https://github.com/madkne/project_installer_g2\` repository
4. \`cd project_installer_g2\`
5. import current profile with \`dat import\`

## authors

created by Project-Installer-gen2
        `);
        // =>load profiles
        let profiles = await loadProfiles();
        profiles.push({
            name: profileName,
            path: profilePath,
        });
        // =>add profile to env
        ENV.save('profiles', profiles);


        LOG.success(`profile '${profileName}' successfully created in '${profilePath}'`);
        return true;
    }



} 