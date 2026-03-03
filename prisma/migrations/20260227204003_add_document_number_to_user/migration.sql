/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,documentNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `documentNumber` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "documentNumber" TEXT;

-- Update existing users with their id as document number to avoid index conflicts
UPDATE "users" SET "documentNumber" = id WHERE "documentNumber" IS NULL;

-- Make it NOT NULL
ALTER TABLE "users" ALTER COLUMN "documentNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_organizationId_documentNumber_key" ON "users"("organizationId", "documentNumber");
