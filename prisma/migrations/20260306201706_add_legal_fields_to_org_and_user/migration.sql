-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address" TEXT,
ADD COLUMN     "cuit" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "phone" TEXT;
