# Application Requirements for Deploy

every application deployed on a subdomain that cloned from a git repository.

every application needs a `Dockerfile` file.

also for more configurations and customizations, you can use a `service.configs.js` file.

> every app, must be have a `Dockerfile` file and can have `service.configs.js` file to run more scripts

you can put such staff (Dockerfile, script file) on your service repository or you can create `{profile}/services/{service}/` folder and put your devops files on it. after clone your service, files of this folder, overwrite on `{profile}/.dist/clones/{service}/` folder.

## `service.configs.js` file

## supported functions

### `compileFiles` (**first to run**)

return list of files that must compiled with config variables.
and runs after clone service repository (if clone enabled)

### `init`

run after clone service repository (if clone enabled)

### `beforeBuild`

before docker build of service (is build enabled)

### `finish`

runs after docker run all services.

## sample code

```js
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');

async function finish(configs, libs = { git: undefined, logs: undefined, os: undefined }, argvs = []) {
    try {
        libs.logs.info('run migrations, static collector for backend...');
        // =>copy backend app hook
        await child_process.execSync(`sudo docker cp ${path.join(configs._env.dist_path, 'clones', 'backend', 'docker_entrypoint.sh')} ${configs.project.name}_${configs.project._env}_backend:/app/init.sh`);
        // =>execute shell file
        await libs.os.shell(`sudo docker exec ${configs.project.name}_${configs.project._env}_backend bash -c "chmod +x /app/init.sh; /app/init.sh"`);
        return true;
    } catch (e) {
        libs.logs.error(e);
        console.error(e);
        return false;
    }
}

async function init(configs, libs = { git: undefined, logs: undefined, os: undefined }, argvs = []) {
    try {
        let backRepoPath = configs._env.dist_path + '/clones/backend/';
        // =>set base url on env prod of frontend
        libs.logs.info('config on environment of frontend...');
        fs.writeFileSync(
            path.join(backRepoPath, "static", "base", "js", "configs.js"),
            `
        var configs = { 
            baseUrl: '${configs.variables.api_base_url}',
            baseUrlWorkflow: '${configs.variables.workflowBaseUrl}',
            loginUrl: "${configs.variables.appUrl}auth/login",
            appUrl: "${configs.variables.appUrl}",
        };`
        );

        return true;
    } catch (e) {
        libs.logs.error(e);
        console.error(e);
        return false;
    }
}
exports.init = init
exports.finish = finish

```
