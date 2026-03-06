-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "applicationSignedAt" TIMESTAMP(3),
ADD COLUMN     "dataConsentAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "signatureIp" TEXT,
ADD COLUMN     "signatureMetadata" JSONB;
