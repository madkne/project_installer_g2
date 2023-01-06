export type CommandName = 'install' | 'stop' | 'log' | 'add' | 'import';
export type CommandArgvName = 'skip-remove-unused-images' | 'skip-clone-projects' | 'skip-build-projects' | 'remove-containers' | 'environment' | 'services' | 'follow' | 'service' | 'skip-caching-build' | 'skip-updating-server-log' | 'name' | 'path' | 'profile' | 'storages' | 'all-services' | 'all-storages';

export type ConfigVariableKey = 'git_username' | 'git_password' | 'env_path' | 'dist_path' | 'dockerfiles_path' | 'ssl_path' | 'env_hooks_path' | 'dist_hooks_path';

export type ServiceConfigsFunctionName = 'compileFiles' | 'init' | 'beforeBuild' | 'finish';

export type DockerContainerHealthType = 'starting' | 'healthy' | 'unhealthy' | 'stopped';

export type NginxErrorPage = '404' | '500' | '501' | '502' | '503' | '504';

export interface ProjectConfigs {
    _env: { [k in ConfigVariableKey]: any };
    project: {
        name: string;
        version?: number;
        extends?: string;
        /**
         * @default 'docker.io'
         */
        docker_register?: string;
        debug?: boolean;

        _env?: string;
    };
    domain: {
        name: string;
        ssl_enabled?: boolean;
    };
    services: { [k: string]: Service };
    storages?: { [k: string]: Storage };
    variables?: { [k: string]: any };
}

export type ConfigMode = 'dev' | 'prod';

export interface Service {
    sub_domain: string;
    disabled?: boolean;
    clone: {
        url: string;
        /**
         * @default master
         */
        branch?: string;
    };
    docker: {
        /**
         * @default true
         */
        build_kit_enabled?: boolean;
        /**
         * @default 80
         */
        port: string;
        volumes?: string[];
        envs?: { [k: string]: any };
        links?: string[];
        hosts?: string[];
        health_check?: HealthCheck;
        mounts?: string[];
        depends?: string[];

        _expose_port?: number;
        _host_port?: number;
        _depend_containers?: string[];
        _health_status?: DockerContainerHealthType;
        _ip?: string;
    };
    web: {
        locations?: AppLocation[];
        maintenance?: {
            enabled: boolean;
            /**
             * @default 503.html
             */
            filename?: string;
            allowed_ips?: string[];
        };
        /**
         * set custom error pages in `custom/` dir
         */
        error_pages?: { [k in NginxErrorPage]?: string };

        _abs_error_pages?: { [k in NginxErrorPage]?: string };
    };

}

export interface AppLocation {
    url: string;
    modifier?: string;
    alias?: string;
    internal?: boolean;
}


export interface Storage {
    type: "mysql" | "mongo" | "redis";
    port: number;
    init_db_names: string[];
    root_password?: string;
    allow_public?: boolean;
    /**
     * @default UTC
     */
    timezone?: string;
    /**
     * auto filled
     */
    // command?: string;
    image?: string;
    realPort?: number;
    volumes?: string[];
    envs?: object;
    argvs?: string[];
    __has_envs?: boolean;
    health_check?: HealthCheck;
    _health_status?: DockerContainerHealthType;
}

export interface Profile {
    name: string;
    path: string;
    defaultEnv?: string;
}

export interface HealthCheck {
    test: string;
    /**
     * @default 30s
     */
    timeout?: string;
    /**
     * @default 30s
     */
    interval?: string;
    /**
     * @default 30
     */
    retries?: number;
}