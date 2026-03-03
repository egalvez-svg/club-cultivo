/*
  Warnings:

  - You are about to drop the column `createdById` on the `dispensations` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `dispensations` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `patients` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `performedById` to the `dispensations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recipientId` to the `dispensations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "dispensations" DROP CONSTRAINT "dispensations_createdById_fkey";

-- DropForeignKey
ALTER TABLE "dispensations" DROP CONSTRAINT "dispensations_patientId_fkey";

-- DropForeignKey
ALTER TABLE "patients" DROP CONSTRAINT "patients_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_patientId_fkey";

-- AlterTable
ALTER TABLE "dispensations" DROP COLUMN "createdById",
DROP COLUMN "patientId",
ADD COLUMN     "performedById" TEXT NOT NULL,
ADD COLUMN     "recipientId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "patientId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reprocanNumber" TEXT,
ADD COLUMN     "status" "PatientStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- DropTable
DROP TABLE "patients";

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
