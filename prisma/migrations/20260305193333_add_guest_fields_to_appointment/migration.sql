-- DropForeignKey
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_patientId_fkey";

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "guestName" TEXT,
ADD COLUMN     "guestPhone" TEXT,
ALTER COLUMN "patientId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
