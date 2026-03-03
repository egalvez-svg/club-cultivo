/*
  Warnings:

  - Changed the type of `presentationType` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `physicalUnitType` on the `products` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductPresentationType" AS ENUM ('FLOWER', 'OIL', 'EXTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "PhysicalUnitType" AS ENUM ('GRAMS', 'ML', 'UNIT');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "presentationType",
ADD COLUMN     "presentationType" "ProductPresentationType" NOT NULL,
DROP COLUMN "physicalUnitType",
ADD COLUMN     "physicalUnitType" "PhysicalUnitType" NOT NULL;
