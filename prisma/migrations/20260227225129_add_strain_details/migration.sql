-- CreateEnum
CREATE TYPE "StrainType" AS ENUM ('INDICA', 'SATIVA', 'HYBRID', 'OTHER');

-- AlterTable
ALTER TABLE "strains" ADD COLUMN     "cbdPercentage" DOUBLE PRECISION,
ADD COLUMN     "thcPercentage" DOUBLE PRECISION,
ADD COLUMN     "type" "StrainType" NOT NULL DEFAULT 'OTHER';
