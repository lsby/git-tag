-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_git_provider_config" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "provider_type" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    CONSTRAINT "git_provider_config_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
INSERT INTO "new_git_provider_config" ("created_at", "id", "provider_type", "token", "updated_at", "user_id") SELECT "created_at", "id", "provider_type", "token", "updated_at", "user_id" FROM "git_provider_config";
DROP TABLE "git_provider_config";
ALTER TABLE "new_git_provider_config" RENAME TO "git_provider_config";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
