/*
  Warnings:

  - You are about to drop the column `productId` on the `production_lots` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "production_lots" DROP CONSTRAINT "production_lots_productId_fkey";

-- AlterTable
ALTER TABLE "generated_reports" ADD COLUMN     "content" BYTEA;

-- AlterTable
ALTER TABLE "production_lots" DROP COLUMN "productId",
ADD COLUMN     "availableEquivalentGrams" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "requiresPasswordChange" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "_ProductToLots" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductToLots_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProductToLots_B_index" ON "_ProductToLots"("B");

-- AddForeignKey
ALTER TABLE "_ProductToLots" ADD CONSTRAINT "_ProductToLots_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductToLots" ADD CONSTRAINT "_ProductToLots_B_fkey" FOREIGN KEY ("B") REFERENCES "production_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;
