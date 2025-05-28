-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mobileRefreshTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "webRefreshTokenExpiresAt" TIMESTAMP(3);
