// 该文件由脚本自动生成, 请勿修改.
// 这是供前端 OPFS 数据库建表使用的 SQL 语句
export let 初始建表SQL = `
-- CreateTable
CREATE TABLE "system_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_initialized" BOOLEAN NOT NULL DEFAULT false,
    "enable_register" BOOLEAN NOT NULL,
    "enable_get_interface_type" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL,
    "jwt_secret" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "user_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "clone_protocol" TEXT,
    "default_clone_path" TEXT,
    CONSTRAINT "user_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "pwd" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "git_provider_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    CONSTRAINT "git_provider_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "git_repo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "raw_data" TEXT NOT NULL,
    CONSTRAINT "git_repo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT "git_repo_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "git_provider_config" ("id") ON DELETE CASCADE ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "git_tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "git_repo_tag_relation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repo_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    CONSTRAINT "git_repo_tag_relation_repo_id_fkey" FOREIGN KEY ("repo_id") REFERENCES "git_repo" ("id") ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT "git_repo_tag_relation_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "git_tag" ("id") ON DELETE CASCADE ON UPDATE RESTRICT
);

-- CreateTable
CREATE TABLE "git_ignored_repo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    CONSTRAINT "git_ignored_repo_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE RESTRICT
);

-- CreateIndex
CREATE UNIQUE INDEX "user_config_user_id_key" ON "user_config"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_name_key" ON "user"("name");

-- CreateIndex
CREATE UNIQUE INDEX "git_tag_name_key" ON "git_tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "git_ignored_repo_user_id_full_name_key" ON "git_ignored_repo"("user_id", "full_name");
`
