import { ConfigMode, ConfigsObject, ConfigVariableKey, SubDomain } from "./types";
import * as ENV from '@dat/lib/env';
import * as LOG from '@dat/lib/log';
import * as fs from 'fs';
import * as path from 'path';
import * as OS from '@dat/lib/os';
import * as TEM from '@dat/lib/template';

export async function loadAllConfig(mode: ConfigMode = 'prod'): Promise<ConfigsObject> {
    let configs = await ENV.loadAll() as ConfigsObject;
    // =>read .env.json file
    let envPath = path.join(await OS.cwd(), '.env.' + mode + '.json');
    try {
        let envFile = JSON.parse(fs.readFileSync(envPath).toString()) as ConfigsObject;
        // =>merge env contents to configs
        for (const key of Object.keys(envFile)) {
            configs[key] = envFile[key];
        }
    } catch (e) {
        LOG.errorStatus(`fix '.env.${mode}.json' file`);
        console.error(e);
        process.exit(1);
    }

    let ConfigVariables: { name: ConfigVariableKey; default?: any }[] = [
        // {
        //     name: 'backend_project_docker_image',
        //     default: `${projectEnv.project_name}_backend:production`,
        // },
        // {
        //     name: 'frontend_project_docker_image',
        //     default: `${projectEnv.project_name}_frontend:production`,
        // },


        {
            name: 'docker_registery',
            default: 'docker.io',//'dockerhub.ir',
        },
    ];
    // =>set default configs, if not set
    for (const conf of ConfigVariables) {
        if (!await ENV.has(conf.name) && conf.default !== undefined) {
            await ENV.save(conf.name, conf.default);
            configs[conf.name] = conf.default;
        }
    }

    configs.dist_path = path.join(await OS.cwd(), '.dist');
    configs.env_path = path.join(await OS.cwd(), 'env');
    configs.ssl_path = path.join(await OS.cwd(), 'env', 'ssl');
    fs.mkdirSync(configs.ssl_path, { recursive: true });
    configs.dockerfiles_path = path.join(configs.dist_path, 'dockerfiles');
    fs.mkdirSync(configs.dockerfiles_path, { recursive: true });
    configs.docker_compose_command = `sudo docker-compose -f ${path.join(configs.dist_path, 'docker-compose.yml')} --project-name ${configs.project_name}`;
    // =>replace variables
    if (!configs.variables) configs.variables = {};

    configs = await advancedLoadConfigs(configs, envPath) as any;
    // =>remove disabled sub domains
    configs.sub_domains = (configs.sub_domains as SubDomain[]).filter(i => !i.disabled);
    // console.log('configs:', configs)
    return configs;
}

async function advancedLoadConfigs(configs: object, envPath: string) {
    let newConfigs = await TEM.renderString(fs.readFileSync(envPath).toString(), { data: configs });

    let newConfigsJson = JSON.parse(newConfigs.data);
    for (const key of Object.keys(newConfigsJson)) {
        configs[key] = newConfigsJson[key];
    }



    return configs;
}

export function loadSubDomains(configs: ConfigsObject): SubDomain[] {
    return configs.sub_domains ?? [] as SubDomain[];
}


export async function stopContainers(names?: string[], isRemove = false, configs?: ConfigsObject) {
    // =>load all configs
    if (!configs) {
        configs = await loadAllConfig();
    }
    if (names) {
        LOG.info(`Stopping '${names.join(', ')}' Services...`);
        for (const name of names) {
            // =>if remove container
            if (isRemove && await OS.shell(`${configs.docker_compose_command} stop ${name}`, configs.dist_path) !== 0) {
                return false;
            }
            // =>if just stop
            else {
                if (!isRemove && await OS.shell(`${configs.docker_compose_command} rm  ${name}`, configs.dist_path) !== 0) return false;
            }
        }
    } else {
        LOG.info('Stopping All Services...');
        // =>if remove container
        if (isRemove && await OS.shell(`${configs.docker_compose_command} down --remove-orphans`, configs.dist_path) !== 0) {
            return false;
        }
        // =>if just stop
        else {
            if (!isRemove && await OS.shell(`${configs.docker_compose_command} rm -s `, configs.dist_path) !== 0) return false;
        }

        return true;
    }
}

export function clone(obj: any) {
    return JSON.parse(JSON.stringify(obj));
}

export async function generateSSL(configs: ConfigsObject) {
    // =>root path
    const rootSSLPath = path.join(configs.ssl_path, 'root');
    fs.mkdirSync(rootSSLPath, { recursive: true });
    // =>wildcard path
    const wildcardSSLPath = path.join(configs.ssl_path, 'wildcard');
    fs.mkdirSync(wildcardSSLPath, { recursive: true });
    // =>check ssl root files exist
    if (!fs.existsSync(path.join(rootSSLPath, 'cert.crt')) || !fs.existsSync(path.join(rootSSLPath, 'cert.key'))) {
        LOG.info('generating self signed ssl files (root domain) ...');
        if (!await _generateSelfSignedSSl(rootSSLPath, configs.domain_name, configs.domain_name)) return false;
        await OS.shell(`sudo chmod -R 777 ${configs.ssl_path}`);
    }
    // =>check ssl wildcard (sub domains) files exist
    if (!fs.existsSync(path.join(wildcardSSLPath, 'cert.crt')) || !fs.existsSync(path.join(wildcardSSLPath, 'cert.key'))) {
        LOG.info('generating self signed ssl files (wildcard) ...');
        if (!await _generateSelfSignedSSl(wildcardSSLPath, configs.domain_name, '*.' + configs.domain_name)) return false;
        await OS.shell(`sudo chmod -R 777 ${configs.ssl_path}`);
    }
    // =>copy ssl folder to .dist
    OS.copyDirectory(configs.ssl_path, path.join(configs.dist_path, 'ssl'));
}

async function _generateSelfSignedSSl(sslPath: string, domainName: string, commonName: string) {
    // let res12 = await OS.shell(`sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout ${path.join(this.configs.ssl_path, 'cert.key')} -out ${path.join(this.configs.ssl_path, 'cert.crt')}`, this.configs.ssl_path);
    let commands = `
SUBJ="
C=US
ST=NY
O=Local Developement
localityName=Local Developement
commonName=${commonName}
organizationalUnitName=Local Developement
emailAddress=admin@${domainName}
" &&
openssl genrsa -out "${path.join(sslPath, 'cert.key')}" 2048 &&
openssl req -new -subj "$(echo -n "$SUBJ" | tr "\\n" "/")" -key "${path.join(sslPath, 'cert.key')}" -out "${path.join(sslPath, 'cert.csr')}" &&
openssl x509 -req -days 3650 -in "${path.join(sslPath, 'cert.csr')}" -signkey "${path.join(sslPath, 'cert.key')}" -out "${path.join(sslPath, 'cert.crt')}" &&
rm "${path.join(sslPath, 'cert.csr')}"
`;
    // console.log(commands)
    let res12 = await OS.shell(commands, sslPath)
    if (res12 !== 0) {
        return false;
    }

    return true;
}