import * as LOG from "@dat/lib/log";
import * as ARG from "@dat/lib/argvs";
import * as IN from "@dat/lib/input";
import * as ENV from "@dat/lib/env";
import * as GIT from "@dat/lib/git";
import * as DOCKER from "@dat/lib/docker";
import * as OS from "@dat/lib/os";
import * as TEM from "@dat/lib/template";
import * as SET from "@dat/lib/settings";
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { InstallCommand } from "./src/commands/install";
import { loadAllConfig } from "./src/common";

// dotenv.config();
/************************************* */
// type CommandName = 'install' | 'createSuperUser' | 'run-mysql' | 'stop';
// type CommandArgvName = 'non-interactive' | 'level' | 'skip-rebuild-frontend' | 'skip-rebuild-backend' | 'restart_mysql' | 'skip-remove-unused-images' | 'skip-clone-frontend' | 'skip-clone-backend' | 'remove';
// type ConfigVariableKey = 'git_username' | 'git_password' | 'docker_registery' | 'backend_project_docker_image' | 'frontend_project_docker_image' | 'allowed_host' | 'env_path' | 'dist_path';
// type ConfigsObject = { [k in ConfigVariableKey]: any };
/************************************* */
const VERSION = '0.36';
// let configs: ConfigsObject;
// let distPath: string;
// let envPath: string;
// let sslPath: string;
// let envHooksPath: string;
// let distBackendProjectPath: string; 
// let distFrontendProjectPath: string;
// let dockerComposeCommand: string;
// let projectEnv: EnvFileStruct;

// function loadDefualtEnvVariables() {
//    let envFile: EnvFileStruct = JSON.parse(JSON.stringify(process.env));
//    if (!envFile.mysql_port) {
//       envFile.mysql_port = 3306;
//    }
//    if (envFile.debug_mode === undefined) {
//       envFile.debug_mode = true;
//    }
//    if (envFile.allow_public_mysql == undefined) {
//       envFile.allow_public_mysql = false;
//    }
//    if (envFile.allow_public_redis == undefined) {
//       envFile.allow_public_redis = false;
//    }
//    if (envFile.ssl_enabled == undefined) {
//       envFile.ssl_enabled = false;
//    }
//    if (!envFile.clone_branch) {
//       envFile.clone_branch = 'master';
//    }
//    if (!envFile.app_subdomain_name) {
//       envFile.app_subdomain_name = 'app';
//    }
//    for (const key of Object.keys(envFile)) {
//       try {
//          envFile[key] = JSON.parse(envFile[key]);
//       } catch (e) { }
//    }
//    // console.log(envFile)
//    return envFile;
// }
/************************************* */
export async function main(): Promise<number> {
   LOG.clear();
   let configs = await loadAllConfig();
   LOG.success(`*** ${configs.project_name} Installer - version ${VERSION} ***`);
   await SET.showStatistics();

   await ARG.cli();
   InstallCommand



   // =>define argvs of script
   // let res = await ARG.define<CommandName, CommandArgvName>([
   //    {
   //       name: 'install',
   //       description: `install ${projectEnv.project_name} using env variables`,
   //       alias: 'i',
   //       implement: async () => await install(),
   //       argvs: [
   //          {
   //             name: 'level',
   //             alias: 'l',
   //             description: `Level of install ${projectEnv.project_name} (default is 1)`,
   //             type: 'number',
   //             defaultValue: 1,
   //          },
   //          {
   //             name: 'skip-rebuild-frontend',
   //             alias: 's1',
   //             description: `skip to rebuild docker of ${projectEnv.project_name} frontend project`,
   //             type: 'boolean',
   //          },
   //          {
   //             name: 'skip-rebuild-backend',
   //             alias: 's2',
   //             description: `skip to rebuild docker of ${projectEnv.project_name} backend project`,
   //             type: 'boolean',
   //          },
   //          {
   //             name: 'skip-clone-frontend',
   //             alias: 's3',
   //             description: `skip to clone frontend app`,
   //             type: 'boolean',
   //          },
   //          {
   //             name: 'skip-clone-backend',
   //             alias: 's4',
   //             description: `skip to clone backend app`,
   //             type: 'boolean',
   //          },
   //          {
   //             name: 'skip-remove-unused-images',
   //             alias: 's5',
   //             description: `skip to remove unused docker images`,
   //             type: 'boolean',
   //          },
   //          {
   //             name: 'restart_mysql',
   //             alias: 'r1',
   //             description: 'restart mysql container too',
   //             type: 'boolean',
   //          },
   //       ],
   //    },
   //    {
   //       name: 'createSuperUser',
   //       description: `create super user for ${projectEnv.project_name} `,
   //       alias: 'su',
   //       implement: async () => await createSuperUser(),
   //    },
   //    {
   //       name: 'run-mysql',
   //       description: 'run just mysql container',
   //       alias: 'mysql',
   //       implement: async () => await runMysql(),
   //    },
   //    {
   //       name: 'stop',
   //       description: 'stop all containers or one container',
   //       alias: 'stp',
   //       implement: async () => await stopContainers(),
   //       argvs: [
   //          // {
   //          //    name: 'service',
   //          //    alias: 's',
   //          //    description: 'service that want to stop it',
   //          // },
   //          {
   //             name: 'remove',
   //             alias: 'r',
   //             description: 'remove container',
   //          },
   //       ],
   //    },
   // ]);
   // if (!res) return 1;

   return 0;
}
/************************************* */
/************************************* */
// async function install() {
//    // =>load all configs
//    configs = await loadAllConfig();
//    // =>check ssl files exist
//    if (projectEnv.ssl_enabled && (!fs.existsSync(path.join(sslPath, 'cert.crt')) || !fs.existsSync(path.join(sslPath, 'cert.key')))) {
//       LOG.info('generating ssl files ...');
//       let res12 = await OS.shell(`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ${path.join(sslPath, 'cert.key')} -out ${path.join(sslPath, 'cert.crt')}`, sslPath);
//       if (res12 !== 0) {
//          return false;
//       }
//       await OS.shell(`sudo chmod -R 777 ${sslPath}`);
//    }
//    // =>copy ssl folder to .dist
//    OS.copyDirectory(sslPath, path.join(distPath, 'ssl'));
//    // =>get git username, if not
//    if (!configs.git_username || configs.git_username.length === 0) {
//       configs.git_username = await IN.input('Enter git username:');
//       await ENV.save('git_username', configs.git_username);
//    }
//    // =>get git password, if not
//    if (!configs.git_password || configs.git_password.length === 0) {
//       configs.git_password = await IN.password('Enter git password:');
//       await ENV.save('git_password', configs.git_password);
//    }
//    // =>remove unused docker images
//    if (!ARG.hasArgv<CommandArgvName>('skip-remove-unused-images')) {
//       await LOG.info('removing unused docker images...');
//       await OS.exec(`sudo docker rmi $(docker images --filter "dangling=true" -q --no-trunc)
//       `);
//    }
//    // =>if level is 1 or less (clone backend)
//    if (!ARG.hasArgv<CommandArgvName>('skip-clone-backend') && ARG.getArgv<number>('level') <= 1) {
//       // =>disable ssl verify
//       await OS.exec(`git config --global http.sslVerify false`);
//       // clone project in dist folder
//       await OS.rmdir(distBackendProjectPath);
//       fs.mkdirSync(distBackendProjectPath, { recursive: true });
//       LOG.info('cloning backend project...');
//       let res = await GIT.clone({
//          cloneUrl: projectEnv.backend_clone_url,
//          branch: projectEnv.clone_branch,
//          depth: 1,
//          username: configs.git_username,
//          password: configs.git_password,
//       }, distBackendProjectPath);
//       LOG.log(res.stderr);
//       if (res.code !== 0) return false;
//       // =>move from clone branch dir to root dir
//       await OS.copyDirectory(path.join(distBackendProjectPath, projectEnv.clone_branch), distBackendProjectPath);
//       await OS.rmdir(path.join(distBackendProjectPath, projectEnv.clone_branch));
//    }
//    // =>if level is 2 or less (clone frontend)
//    if (!ARG.hasArgv<CommandArgvName>('skip-clone-frontend') && ARG.getArgv<number>('level') <= 2) {
//       // =>disable ssl verify
//       await OS.exec(`git config --global http.sslVerify false`);
//       // clone front project in dist folder
//       await OS.rmdir(distFrontendProjectPath);
//       fs.mkdirSync(distFrontendProjectPath, { recursive: true });
//       LOG.info('cloning frontend project...');
//       let res = await GIT.clone({
//          cloneUrl: projectEnv.app_clone_url,
//          branch: projectEnv.clone_branch,
//          depth: 1,
//          username: configs.git_username,
//          password: configs.git_password,
//       }, distFrontendProjectPath);
//       LOG.log(res.stderr);
//       if (res.code !== 0) return false;
//       // =>move from clone branch dir to root dir
//       await OS.copyDirectory(path.join(distFrontendProjectPath, projectEnv.clone_branch), distFrontendProjectPath);
//       await OS.rmdir(path.join(distFrontendProjectPath, projectEnv.clone_branch));
//       // =>clone core frontend app
//       if (projectEnv.frontend_core_clone_path && projectEnv.frontend_core_clone_url) {
//          const distCoreFrontendPath = path.join(distFrontendProjectPath, projectEnv.frontend_core_clone_path);
//          fs.mkdirSync(distCoreFrontendPath, { recursive: true });
//          LOG.info('cloning core frontend project...');
//          let res1 = await GIT.clone({
//             cloneUrl: projectEnv.frontend_core_clone_url,
//             branch: projectEnv.clone_branch,
//             depth: 1,
//             username: configs.git_username,
//             password: configs.git_password,
//          }, distCoreFrontendPath);
//          LOG.log(res1.stderr);
//          if (res1.code !== 0) {
//             LOG.error(res1.stderr);
//             return false;
//          }
//          // =>move from clone branch dir to root dir
//          await OS.copyDirectory(path.join(distCoreFrontendPath, projectEnv.clone_branch), distCoreFrontendPath);
//          await OS.rmdir(path.join(distCoreFrontendPath, projectEnv.clone_branch));
//       }
//       // =>set base url on env prod of frontend
//       fs.writeFileSync(path.join(distFrontendProjectPath, 'src', 'environments', 'environment.prod.ts'), `export const environment = {
//          production: true,
//          baseUrl: '${projectEnv.api_base_url}',
// 	 djangoUrl: '${projectEnv.django_base_url}',
//        };`);

//    }
//    // =>create hook dirs
//    let hookDirs = ['mysql', 'nginx', 'nginx/conf', 'app', 'app/settings', 'caddy'];
//    for (const d of hookDirs) {
//       fs.mkdirSync(path.join(distPath, 'hooks', d), { recursive: true });
//    }
//    // =>render hooks
//    let hookFiles = [
//       // 'mysql/init.sql',
//       'nginx/uwsgi_params',
//       'nginx/conf/nginx.conf',
//       'app/settings/production.py',
//       'nginx/front_nginx.conf',
//       'app/front/configs.js',
//       'caddy/Caddyfile',
//    ];

//    // console.log({ ...configs, ...projectEnv })
//    for (const f of hookFiles) {
//       await TEM.saveRenderFile(path.join(envHooksPath, f), path.dirname(path.join(distPath, 'hooks', f)), { data: { ...configs, ...projectEnv }, noCache: true });
//    }
//    // =>copy backend project settings to hooks dir
//    fs.mkdirSync(path.join(distPath, 'hooks', 'app'), { recursive: true });
//    await OS.copyDirectory(path.join(distPath, 'hooks', 'app', 'settings'), path.join(distBackendProjectPath, projectEnv.django_settings_module_name + '/settings'));

//    // =>render root files
//    let files = ['backend_Dockerfile', 'frontend_Dockerfile', 'docker-compose.yml', '.dockerignore'];
//    for (const f of files) {
//       await TEM.saveRenderFile(path.join(envPath, f), distPath, { data: { ...configs, ...projectEnv }, noCache: true });
//    }

//    // =>get list of apps of project
//    // this apps should make migrations first, because of dependency 
//    let appsList = projectEnv.django_apps_names.split(',');
//    // add other apps
//    let dirs = fs.readdirSync(distBackendProjectPath, { withFileTypes: true });
//    for (const d of dirs) {
//       // => skeep if already exist
//       if (appsList.includes(d.name)) continue;
//       // =>ignore if file
//       if (d.isFile()) continue;
//       // =>check really app
//       if (!fs.existsSync(path.join(distBackendProjectPath, d.name, 'apps.py'))) continue;
//       // =>add app
//       appsList.push(d.name);
//    }
//    // =>render app entry point
//    await TEM.saveRenderFile(path.join(envPath, 'docker_entrypoints', 'app.sh'), path.join(distPath, 'docker_entrypoints'), { data: { configs, appsList }, noCache: true });
//    // =>copy app production to hooks/ folder
//    // await OS.copyDirectory(path.join(env), distProjectPath);

//    // =>build backend docker file
//    if (!ARG.hasArgv<CommandArgvName>('skip-rebuild-backend')) {
//       LOG.info('building Dockerfile of backend ...');
//       await OS.shell(`docker build -t ${configs.backend_project_docker_image} -f backend_Dockerfile .`, distPath);
//    }
//    // =>build frontend docker file
//    if (!ARG.hasArgv<CommandArgvName>('skip-rebuild-frontend')) {
//       LOG.info('building Dockerfile of frontend ...');
//       await OS.shell(`docker build -t ${configs.frontend_project_docker_image} -f frontend_Dockerfile .`, distPath);
//    }
//    // =>stop docker composes
//    if (ARG.hasArgv<CommandArgvName>('restart_mysql')) {
//       await stopContainers();
//    } else {
//       await stopContainers('nginx');
//       await stopContainers('backend_app');
//       await stopContainers('frontend_app');
//    }
//    // =>build docker composes
//    LOG.info('Running services...');
//    if (await OS.shell(`${dockerComposeCommand} up --remove-orphans -d`, distPath) !== 0) {
//       return false;
//    }
//    if (fs.existsSync(path.join(distBackendProjectPath, 'init.sh'))) {
//       // =>copy backend app hook
//       if (await OS.shell(`docker cp ${path.join(distBackendProjectPath, 'init.sh')} ${projectEnv.project_name}_backend_app_1:/app`) !== 0) return false;
//       // =>execute shell file
//       if (await OS.shell(`docker exec ${projectEnv.project_name}_backend_app_1 bash -c "chmod +x /app/init.sh; /app/init.sh"`) !== 0) {
//          LOG.error('error for copy backend app hook');
//          return false;
//       }

//    }

//    // create system user if not exist
//    // await createSystemUser()

//    LOG.success(`You must set '${projectEnv.domain_name}', '${projectEnv.app_subdomain_name}.${projectEnv.domain_name}' domains on '/etc/hosts' file.\nYou can see project on http${projectEnv.ssl_enabled ? 's' : ''}://${projectEnv.domain_name}`);
//    return true;
// }
// /************************************* */
// async function runMysql() {
//    // =>load all configs
//    configs = await loadAllConfig();
//    // =>render root files
//    let files = ['Dockerfile', 'docker-compose.yml', '.dockerignore'];
//    for (const f of files) {
//       await TEM.saveRenderFile(path.join(envPath, f), distPath, { data: configs, noCache: true });
//    }
//    // =>stop mysql
//    await stopContainers('mysql');

//    // =>build docker composes
//    LOG.info('Running mysql...');
//    if (await OS.shell(`${dockerComposeCommand} up mysql`, distPath) !== 0) return false;

//    return true;
// }
// /************************************* */
// async function stopContainers(serviceName?: string) {
//    // =>load all configs
//    configs = await loadAllConfig();
//    // =>get service name
//    let service = ARG.getArgv('service');
//    if (serviceName) service = serviceName;
//    LOG.info('Stopping Services...');
//    // =>if remove container
//    if (ARG.hasArgv('remove') && await OS.shell(`${dockerComposeCommand} down ${service ? service : ''} --remove-orphans`, distPath) !== 0) return false;
//    // =>if just stop
//    else if (!ARG.hasArgv('remove') && await OS.shell(`${dockerComposeCommand} stop ${service ? service : ''}`, distPath) !== 0) return false;

//    return true;
// }
// /************************************* */
// // async function createSuperUser() {
// //    // =>load all configs
// //    configs = await loadAllConfig();
// //    // let userName: string = await IN.input('Enter your username: ')
// //    let email: string = await IN.input('Enter your email: ')
// //    let password: string = await IN.password('Enter your password: ')

// //    LOG.log(`creating super user...`)
// //    let res = await OS.shell(`docker container exec ${projectEnv.project_name}_backend_app_1 bash -c "python /app/manage.py shell -c \\"from django.contrib.auth import get_user_model; User = get_user_model(); User.objects.create_superuser('${email}', '${password}')\\""`);

// //    if (res === 0) {
// //       LOG.success('super user created.');
// //       return;
// //    }
// //    LOG.error(`error: couldn't create super user!`)
// //    return;
// // }
// // async function createSystemUser() {
// //    LOG.log(`creating system user if not exists...`)
// //    let pythonScriptPath = path.join(envHooksPath, 'app', 'create_system_user.py')
// //    let res = await OS.shell(`docker cp ${pythonScriptPath}  ${projectEnv.project_name}_app_1:/app`)
// //    if (res !== 0) {
// //       LOG.error(`error: couldn't copy python script to ${projectEnv.project_name}_app_1 container!`)
// //       return;
// //    }
// //    res = await OS.shell(`docker container exec ${projectEnv.project_name}_app_1 bash -c "cat create_system_user.py | python /app/manage.py shell"`)
// //    if (res !== 0) {
// //       LOG.error(`error: couldn't execute python script inside ${projectEnv.project_name}_app_1 container!`)
// //       return;
// //    }
// //    LOG.success('done.');
// //    return;
// // }

// /************************************* */
// /************************************* */
// /************************************* */
// async function loadAllConfig(): Promise<ConfigsObject> {
//    let configs = await ENV.loadAll() as ConfigsObject;
//    let ConfigVariables: { name: ConfigVariableKey; default?: any }[] = [
//       {
//          name: 'docker_project_name',
//          default: 'project',
//       },
//       {
//          name: 'backend_project_docker_image',
//          default: `${projectEnv.project_name}_backend:production`,
//       },
//       {
//          name: 'frontend_project_docker_image',
//          default: `${projectEnv.project_name}_frontend:production`,
//       },

//       {
//          name: 'allowed_host',
//          default: 'localhost',
//       },

//       {
//          name: 'docker_registery',
//          default: 'dockerhub.ir',//'docker.io',
//       },
//    ];
//    // =>set default configs, if not set
//    for (const conf of ConfigVariables) {
//       if (!await ENV.has(conf.name) && conf.default !== undefined) {
//          await ENV.save(conf.name, conf.default);
//          configs[conf.name] = conf.default;
//       }
//    }
//    configs.env_path = envPath;
//    configs.dist_path = distPath;
//    // =>set more vars
//    dockerComposeCommand = `docker-compose -f ${path.join(distPath, 'docker-compose.yml')} --project-name ${projectEnv.project_name}`;
//    //console.log('configs:', configs)
//    return configs;
// }
