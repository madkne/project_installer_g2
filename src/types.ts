export type CommandName = 'install';
export type CommandArgvName = 'skip-remove-unused-images' | 'skip-clone-projects' | 'skip-build-projects' | 'remove-containers';

export type ConfigVariableKey = 'git_username' | 'git_password' | 'docker_registery' | 'backend_project_docker_image' | 'frontend_project_docker_image' | 'env_path' | 'dist_path' | 'domain_name' | 'ssl_enabled' | 'databases' | 'domain_name' | 'sub_domains' | 'variables' | 'ssl_path' | 'docker_compose_command' | 'project_name' | 'dockerfiles_path';
export type ConfigsObject = { [k in ConfigVariableKey]: any };

export interface SubDomain {
    subdomain: string;
    cloneUrl: string;
    /**
     * @default master
     */
    branch?: string;
    name: string;
    volumes?: string[];
    /**
     * @default 80
     */
    port: number;
    envs?: { [k: string]: any };
    depends?: string[];
    /**
     * in default same as port
     */
    exposePort?: number;

    __hasEnvs?: boolean;
}

export interface Database {
    type: "mysql" | "mongo" | "redis";
    port: number;
    dbname: string;
    name: string;
    root_password?: string;
    allow_public_db?: boolean;
    /**
     * @default UTC
     */
    timezone?: string;
    /**
     * auto filled
     */
    command?: string;
    image?: string;
    realPort?: number;
    volumes?: string[];
    envs?: object;
    __has_envs?: boolean;
    healthcheck?: {
        test: string;
        timeout: number;
        retries: number;
    };
}