-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isOtpEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "webRefreshToken" TEXT,
    "webSessionId" TEXT,
    "mobileRefreshToken" TEXT,
    "mobileSessionId" TEXT,
    "userrole" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_webRefreshToken_key" ON "User"("webRefreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_webSessionId_key" ON "User"("webSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileRefreshToken_key" ON "User"("mobileRefreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_mobileSessionId_key" ON "User"("mobileSessionId");
