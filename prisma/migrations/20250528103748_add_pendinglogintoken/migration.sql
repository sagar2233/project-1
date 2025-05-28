-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mobileSessionVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pendingLoginPlatform" TEXT,
ADD COLUMN     "pendingLoginToken" TEXT,
ADD COLUMN     "webSessionVersion" INTEGER NOT NULL DEFAULT 1;
