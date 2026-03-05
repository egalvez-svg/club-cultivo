/*
  Warnings:

  - Changed the type of `reason` on the `appointments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AppointmentReason" AS ENUM ('DISPENSATION', 'MEDICAL_CONSULTATION', 'REPROCAN_RENEWAL', 'REPROCAN_REGISTRATION', 'OTHER');

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "reason",
ADD COLUMN     "reason" "AppointmentReason" NOT NULL;

-- CreateTable
CREATE TABLE "availability_configs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reason" "AppointmentReason" NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "availability_configs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "availability_configs" ADD CONSTRAINT "availability_configs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
