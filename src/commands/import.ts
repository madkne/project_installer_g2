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

export class ImportCommand extends CliCommand<CommandName, CommandArgvName> implements OnImplement {

    configs: ProjectConfigs;
    projectConfigsJsFiles: {} = {};

    get name(): CommandName {
        return 'import';
    }

    get alias(): string {
        return 'im';
    }

    get description(): string {
        return 'import a profile';
    }

    get argvs(): CommandArgvItem<CommandArgvName>[] {
        return [
        ];
    }
    /**************************** */
    async implement(): Promise<boolean> {

        let profilePath = await IN.input('Enter profile path');
        if (!fs.existsSync(profilePath)) {
            LOG.error('not exist such profile: ' + profilePath);
            return false;
        }
        // =>find .profile file
        let profileName: string;
        if (fs.existsSync(path.join(profilePath, '.profile'))) {
            profileName = fs.readFileSync(path.join(profilePath, '.profile')).toString();
        } else {
            profileName = await IN.input('Enter profile name');
        }
        // =>get all envs of profile
        let dirList = fs.readdirSync(profilePath, { withFileTypes: true });
        let profileEnvs: string[] = [];
        for (const f of dirList) {
            if (!f.isFile()) continue;
            if (!/^configs\.\w+\.yml$/.test(f.name)) continue;
            profileEnvs.push(f.name.split('.')[1]);
        }
        // =>set default env
        let defaultEnv = await IN.select('Enter default environment of profile', profileEnvs, profileEnvs[0]);
        // =>load all profiles
        let profiles = await loadProfiles();
        profiles.push({
            name: profileName,
            path: profilePath,
            defaultEnv,
        });
        // =>add profile to env
        ENV.save('profiles', profiles);

        LOG.success(`profile '${profileName}' successfully imported`);
        return true;
    }



} 