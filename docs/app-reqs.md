# Application Requirements for Deploy

every application deployed on a subdomain that cloned from a git repository.

every application needs a `Dockerfile` file.

also for more configurations and customizations, you can use a `prod.config.js` file.

> every app, must be have a `Dockerfile` file and can have `prod.config.js` file to run more scripts

## `prod.config.js` file

## supported functions

- `init`
- `finish`
- `beforeBuild`
- `compileFiles` : return list of files that must compiled with config variables
