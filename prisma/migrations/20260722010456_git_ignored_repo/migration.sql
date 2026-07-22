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
CREATE UNIQUE INDEX "git_ignored_repo_user_id_full_name_key" ON "git_ignored_repo"("user_id", "full_name");
