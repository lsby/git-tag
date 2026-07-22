-- CreateTable
CREATE TABLE "git_provider_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "sync_options" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "git_tag_name_key" ON "git_tag"("name");
