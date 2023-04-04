import { ConfigMode, ConfigVariableKey, DockerContainerHealthType, HealthCheck, NginxErrorPage, Profile, ProjectConfigs, Service } from "./types";
import * as ENV from '@dat/lib/env';
import * as LOG from '@dat/lib/log';
import * as fs from 'fs';
import * as path from 'path';
import * as OS from '@dat/lib/os';
import * as TEM from '@dat/lib/template';
import * as yml from 'js-yaml';


export const NginxErrorPageCodes: NginxErrorPage[] = ['404', '500', '501', '502', '503', '504'];

export const ServicesNetworkSubnetStartOf = '172.18.0';

export async function loadAllConfig(profilePath: string, env = 'prod'): Promise<ProjectConfigs> {
    // =>read configs.json file

    let configs = await _loadConfigs(profilePath, env);
    // =>set env configs
    configs._env = await ENV.loadAll() as any;
    configs._env.dist_path = path.join(profilePath, '.dist');
    configs._env.env_path = path.join(await OS.cwd(), 'env');
    configs._env.ssl_path = path.join(profilePath, 'ssl');
    configs._env.env_hooks_path = path.join(configs._env.env_path, 'hooks');
    configs._env.dist_hooks_path = path.join(configs._env.dist_path, 'hooks');
    // =>create dirs
    fs.mkdirSync(configs._env.ssl_path, { recursive: true });
    configs._env.dockerfiles_path = path.join(configs._env.dist_path, 'dockerfiles');
    fs.mkdirSync(configs._env.dockerfiles_path, { recursive: true });
    fs.mkdirSync(path.join(configs._env.dist_path, 'data', 'nginx'), { recursive: true });
    await OS.exec(`sudo chmod 777 -R ${path.join(configs._env.dist_path, 'data', 'nginx')}`);
    // =set variables in configs
    configs = await _setConfigsVariables(configs, configs.variables);
    // =>set defaults
    if (!configs.project) configs.project = { name: 'sample' };
    if (!configs.project.docker_register) configs.project.docker_register = 'docker.io';
    if (!configs.project.version) configs.project.version = 1;
    if (!configs.project.ip_mapping) configs.project.ip_mapping = 'dhcp';
    configs.project._env = env;
    // =>normalize
    for (const name of Object.keys(configs.services)) {
        // =>fix type of maintenance enabled
        if (configs.services[name]?.web?.maintenance?.enabled && typeof configs.services[name].web.maintenance.enabled === 'string') {
            if (configs.services[name].web.maintenance.enabled === 'true' as any) configs.services[name].web.maintenance.enabled = true;
            else configs.services[name].web.maintenance.enabled = false;
        }
    }

    if (configs.project.debug) {
        console.log('configs:', JSON.stringify(configs, null, 2));
    }

    return configs;
}


async function _loadConfigs(profilePath: string, env = 'prod'): Promise<ProjectConfigs> {
    let configs: ProjectConfigs;
    let configsPath = path.join(profilePath, 'configs.' + env + '.yml');
    try {
        configs = yml.load(fs.readFileSync(configsPath).toString()) as any;
    } catch (e) {
        LOG.errorStatus(`fix '${configsPath}' file`);
        console.error(e);
        process.exit(1);
    }
    // =>check must be extends from another file
    if (configs?.project?.extends) {
        let extendConfigs = await _loadConfigs(profilePath, configs?.project?.extends);
        configs = mergeConfigs(extendConfigs, configs);
    }

    // =>replace variables
    if (!configs.variables) configs.variables = {};

    return configs;
}

async function _setConfigsVariables(configs: ProjectConfigs, vars: object) {
    const parseString = (str: string) => {
        let matches = str.match(/\{\{\s*[\w\d\._]+\s*\}\}/g);
        // console.log(vars)
        if (matches) {
            // console.log(matches)
            for (const match of matches) {
                // =>extract var name
                let varName = match.replace('{{', '').replace('}}', '').trim();
                if (vars[varName] !== undefined) {
                    str = str.replace(match, vars[varName]);
                }
            }
        }
        return str;
    }
    for (const key of Object.keys(configs)) {
        if (typeof configs[key] === 'object') {
            configs[key] = await _setConfigsVariables(configs[key], vars);
        } else if (Array.isArray(configs[key])) {
            for (let conf of configs[key]) {
                if (typeof conf === 'string') {
                    conf = parseString(conf);
                }
            }
        } else {
            if (typeof configs[key] === 'string') {
                configs[key] = parseString(configs[key]);
            }
        }
    }

    return configs;
}

function mergeConfigs(extendConfigs: ProjectConfigs, newConfig: ProjectConfigs): ProjectConfigs {
    newConfig = mergeDeep<ProjectConfigs>(newConfig, extendConfigs);
    if (newConfig.project) {
        newConfig.project.extends = undefined;
    }
    return newConfig;
}

function mergeDeep<T = object>(target: T, needToMerge: T) {

    for (const key of Object.keys(needToMerge)) {
        if (target[key] === undefined) target[key] = needToMerge[key];
        else {
            if (typeof needToMerge[key] === 'object') {
                target[key] = mergeDeep(target[key], needToMerge[key]);
            }
        }
    }
    return target;
}


// export function loadSubDomains(configs: ConfigsObject): Service[] {
//     return configs.sub_domains ?? [] as Service[];
// }


export async function stopContainers(configs: ProjectConfigs, names: string[], isRemove = false, containerType: 'service' | 'storage' | 'web' = 'service') {
    for (const name of names) {
        let containerName: string;
        if (containerType === 'service' || containerType === 'web') {
            containerName = makeDockerServiceName(name, configs);
        }
        else if (containerType === 'storage') {
            containerName = makeDockerStorageName(name, configs);
        }
        // =>check exist such container
        let checkRes = await OS.exec(`sudo docker container port ${containerName}`);
        // console.log(checkRes)
        if (checkRes.stderr.indexOf('No such container') > -1) {
            continue;
        }
        if (containerType === 'service') {
            LOG.info(`Stopping ${name} Service...`);
        } else if (containerType === 'storage') {
            LOG.info(`Stopping ${name} Storage...`);
        }
        await OS.shell(`sudo docker stop ${containerName}`);
        if (isRemove) {
            await OS.shell(`sudo docker rm ${containerName}`);
        }
    }

}

export function clone<T = any>(obj: T) {
    return JSON.parse(JSON.stringify(obj)) as T;
}

export async function generateSSL(configs: ProjectConfigs) {
    const sslPath = path.join(configs._env.ssl_path, configs.project._env);
    // =>root path
    const rootSSLPath = path.join(sslPath, 'root');
    fs.mkdirSync(rootSSLPath, { recursive: true });
    // =>wildcard path
    const wildcardSSLPath = path.join(sslPath, 'wildcard');
    fs.mkdirSync(wildcardSSLPath, { recursive: true });
    // =>check ssl root files exist
    if (!fs.existsSync(path.join(rootSSLPath, 'cert.crt')) || !fs.existsSync(path.join(rootSSLPath, 'cert.key'))) {
        LOG.info('generating self signed ssl files (root domain) ...');
        if (!await _generateSelfSignedSSl(rootSSLPath, configs.domain.name, configs.domain.name)) return false;
        await OS.shell(`sudo chmod -R 777 ${sslPath}`);
    }
    // =>check ssl wildcard (sub domains) files exist
    if (!fs.existsSync(path.join(wildcardSSLPath, 'cert.crt')) || !fs.existsSync(path.join(wildcardSSLPath, 'cert.key'))) {
        LOG.info('generating self signed ssl files (wildcard) ...');
        if (!await _generateSelfSignedSSl(wildcardSSLPath, configs.domain.name, '*.' + configs.domain.name)) return false;
        await OS.shell(`sudo chmod -R 777 ${sslPath}`);
    }
    // =>copy ssl folder to .dist
    OS.copyDirectory(sslPath, path.join(configs._env.dist_path, 'ssl'));
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


export function makeDockerServiceName(name: string, configs: ProjectConfigs) {
    return configs.project.name + '_' + configs.project._env + '_' + name;
}

export function makeDockerStorageName(name: string, configs: ProjectConfigs) {
    return configs.project.name + '_' + configs.project._env + '_' + name;
}

export function makeServiceImageName(name: string, configs: ProjectConfigs) {
    return `${configs.project.name}_${name}:${configs.project.version ?? '1'}`;
}

export async function runDockerContainer(configs: ProjectConfigs, options: {
    name: string;
    ports?: { host: number; container: number, host_ip?: string }[];
    image: string;
    volumes?: string[];
    mounts?: string[];
    envs?: object;
    hosts?: string[];
    links?: string[];
    networkAlias?: string;
    hostname?: string;
    capAdd?: string;
    argvs?: string[];
    ip?: string;
    network?: string;
    pull?: 'never' | 'missing' | 'always';
    healthCheck?: HealthCheck;
}) {
    let command = `sudo docker run --name ${options.name} -d --restart=unless-stopped`;
    if (options.ports) {
        for (const port of options.ports) {
            command += ` -p "${port.host_ip ? port.host_ip + ':' : ''}${port.host}:${port.container}"`;
        }
    }
    if (options.pull) {
        command += ` --pull=${options.pull}`;
    }
    if (options.capAdd) {
        command += ` --cap-add=${options.capAdd}`;
    }
    if (options.hostname) {
        command += ` --hostname "${options.hostname}"`;
    }
    if (options.networkAlias) {
        command += ` --network-alias "${options.networkAlias}"`;
    }
    if (options.network) {
        command += ` --network "${options.network}"`;
    }
    if (options.ip) {
        command += ` --ip "${options.ip}"`;
    }
    if (options.volumes) {
        for (let vol of options.volumes) {
            let vols = vol.split(':');
            vols[0] = path.join(configs._env.dist_path, vols[0]);
            vol = vols.join(':');
            command += ` --volume "${vol}"`;
        }
    }

    if (options.mounts) {
        for (const vol of options.mounts) {
            let vols = vol.split(':');
            vols[0] = path.join(configs._env.dist_path, vols[0]);
            command += ` --mount type=bind,src="${vols[0]}",dst="${vols[1]}"`;
        }
    }
    if (options.links) {
        for (const link of options.links) {
            command += ` --link=${link}`;
        }
    }
    if (options.hosts) {
        for (const host of options.hosts) {
            command += ` --add-host="${host}"`;
        }
    }
    if (options.envs) {
        for (const key of Object.keys(options.envs)) {
            command += ` --env "${key}=${options.envs[key]}"`;
        }
    }
    if (options.healthCheck) {
        if (!options.healthCheck.retries) options.healthCheck.retries = 30;
        if (!options.healthCheck.timeout) options.healthCheck.timeout = '30s';
        if (!options.healthCheck.interval) options.healthCheck.interval = '30s';
        command += ` --health-cmd "${options.healthCheck.test}" --health-interval=${options.healthCheck.interval} --health-retries=${options.healthCheck.retries}`;
    }

    command += ' ' + options.image;
    if (options.argvs) {
        for (const argv of options.argvs) {
            command += ` ${argv}`;
        }
    }
    if (configs.project.debug) {
        console.log(command)
    }
    let res = await OS.shell(command, configs._env.dist_path);

    return res;
}

export async function loadProfiles() {
    return await ENV.load<Profile[]>('profiles', []);
}

export async function checkExistDockerContainerByName(containerName: string) {
    let res = await OS.commandResult(`echo "$(sudo docker ps -a -q -f name=${containerName})"`);
    // console.log(name, res)
    return String(res).trim().length > 0;
}

export async function findProfileByName(name?: string): Promise<Profile> {
    let profiles = await loadProfiles();
    let profile = profiles.find(i => i.name === name);
    if (profile) return profile;
    if (profiles.length > 0) return profiles[0];

    return undefined;
}

export function convertNameToContainerName(configs: ProjectConfigs, names: string[]) {
    let containerNames: string[] = [];
    for (let name of names) {
        // =>find link name in storages
        if (Object.keys(configs.storages).includes(name)) {
            containerNames.push(makeDockerStorageName(name, configs));
        }
        // =>find link name in services
        else if (Object.keys(configs.services).includes(name)) {
            containerNames.push(makeDockerServiceName(name, configs));
        }
    }

    return containerNames;
}

export async function setContainersHealthy(configs: ProjectConfigs) {
    // =>iterate storages
    for (const name of Object.keys(configs.storages)) {
        // =>check if before set status
        if (configs.storages[name]._health_status === 'healthy' || configs.storages[name]._health_status === 'unhealthy') continue;
        // =>fetch status
        configs.storages[name]._health_status = await checkContainerHealthy(configs, makeDockerStorageName(name, configs));
    }
    // console.log('storages:', configs.storages)
    // =>iterate services
    for (const name of Object.keys(configs.services)) {
        // =>check if before set status
        if (configs.services[name].disabled || configs.services[name].docker._health_status === 'healthy' || configs.services[name].docker._health_status === 'unhealthy') continue;
        // =>fetch status
        let res = await checkContainerHealthy(configs, makeDockerServiceName(name, configs));
        if (res) {
            configs.services[name].docker._health_status = res;
        }
    }

    return configs;
}
export async function checkContainerHealthy(configs: ProjectConfigs, containerName: string) {
    let status: DockerContainerHealthType;
    let json: object;
    try {
        let res = await OS.exec(`sudo docker inspect --format='{{json .State.Health}}' ${containerName}`);
        // if (containerName == 'dadgam_local_mongo') {
        //     console.log(res.stdout.substring(1, res.stdout.length - 1))
        // }
        json = JSON.parse(res.stdout.substring(1, res.stdout.length - 1));
        if (json) {
            status = json['Status'] || 'unhealthy';
        }
    } catch (e) { }

    return status;
}

export function copyExistFile(sourcePaths: string[], destPath: string) {
    for (const p of sourcePaths) {
        if (fs.existsSync(p)) {
            fs.copyFileSync(p, destPath);
            break;
        }
    }
}

export async function getContainerIP(containerName: string) {
    try {
        let res = await OS.commandResult(`sudo docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${containerName}`);
        if (!res || res.trim().length < 1) {
            res = await OS.commandResult(`sudo docker inspect --format '{{ .NetworkSettings.IPAddress }}' ${containerName}`);
        }
        return res.trim();
    } catch (e) {
        return undefined;
    }
}

export async function generateServiceContainerStaticIP(configs: ProjectConfigs) {
    let ipNumber = 1;
    for (const key in configs.services) {
        const element = configs.services[key];
        if (!element?.docker?.ip || !element.docker?.ip?.startsWith(ServicesNetworkSubnetStartOf)) continue;
        let lastNumber = element.docker?.ip.split('.').pop();
        if (Number(lastNumber) > ipNumber) {
            ipNumber = Number(lastNumber) + 1;
        } else if (Number(lastNumber) == ipNumber) {
            ipNumber++;
        }
    }
    return ServicesNetworkSubnetStartOf + '.' + ipNumber;
}