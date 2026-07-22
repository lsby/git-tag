import type { ColumnType } from "kysely";
export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;
export type Timestamp = ColumnType<Date, Date | string, Date | string>;

export type git_ignored_repo = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    user_id: string;
    full_name: string;
};
export type git_provider_config = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    user_id: string;
    provider_type: string;
    token: string;
};
export type git_repo = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    user_id: string;
    provider_id: string;
    external_id: string;
    full_name: string;
    description: string;
    url: string;
    stars: number;
    language: string;
    is_private: Generated<number>;
    raw_data: string;
};
export type git_repo_tag_relation = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    repo_id: string;
    tag_id: string;
};
export type git_tag = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    name: string;
};
export type system_config = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    is_initialized: Generated<number>;
    enable_register: number;
    enable_get_interface_type: Generated<number>;
    version: string;
    jwt_secret: string;
};
export type user = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    name: string;
    pwd: string;
    is_admin: number;
};
export type user_config = {
    id: string;
    created_at: Generated<string>;
    updated_at: Generated<string>;
    user_id: string;
    theme: string;
    clone_protocol: string | null;
    default_clone_path: string | null;
};
export type DB = {
    git_ignored_repo: git_ignored_repo;
    git_provider_config: git_provider_config;
    git_repo: git_repo;
    git_repo_tag_relation: git_repo_tag_relation;
    git_tag: git_tag;
    system_config: system_config;
    user: user;
    user_config: user_config;
};
