/*
  Warnings:

  - A unique constraint covering the columns `[magicLink]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ADD COLUMN     "magicLink" TEXT,
ADD COLUMN     "magicLinkExpiry" TIMESTAMP(3),
ADD COLUMN     "otp" TEXT,
ADD COLUMN     "otpExpiry" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_magicLink_key" ON "User"("magicLink");
