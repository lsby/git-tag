-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_git_repo" (
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
INSERT INTO "new_git_repo" ("created_at", "description", "external_id", "full_name", "id", "language", "provider_id", "raw_data", "stars", "updated_at", "url", "user_id") SELECT "created_at", "description", "external_id", "full_name", "id", "language", "provider_id", "raw_data", "stars", "updated_at", "url", "user_id" FROM "git_repo";
DROP TABLE "git_repo";
ALTER TABLE "new_git_repo" RENAME TO "git_repo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
