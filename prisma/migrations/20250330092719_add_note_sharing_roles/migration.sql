-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "sharedWithRoles" TEXT[] DEFAULT ARRAY[]::TEXT[];
