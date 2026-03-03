-- CreateEnum
CREATE TYPE "ReprocanStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'PENDING_RENEWAL', 'REJECTED');

-- CreateTable
CREATE TABLE "reprocan_records" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reprocanNumber" TEXT NOT NULL,
    "expirationDate" TIMESTAMP(3),
    "status" "ReprocanStatus" NOT NULL DEFAULT 'ACTIVE',
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reprocan_records_pkey" PRIMARY KEY ("id")
);

-- Migrate Existing Data
INSERT INTO "reprocan_records" ("id", "patientId", "reprocanNumber", "status")
SELECT gen_random_uuid(), "id", "reprocanNumber", 'ACTIVE'::"ReprocanStatus"
FROM "users"
WHERE "reprocanNumber" IS NOT NULL;

-- AlterTable (Safe to drop now)
ALTER TABLE "users" DROP COLUMN "reprocanNumber";

-- AddForeignKey
ALTER TABLE "reprocan_records" ADD CONSTRAINT "reprocan_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
