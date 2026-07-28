-- AlterTable
ALTER TABLE "B2BAccount" ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "shippingAddress" TEXT,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "hsnCode" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "cgstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "placeOfSupplyState" TEXT,
ADD COLUMN     "quoteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "roundingAdjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "termsAndConditions" TEXT,
ADD COLUMN     "validUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteItem" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT,
    "gstin" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "bankIfsc" TEXT,
    "bankName" TEXT,
    "bankBranch" TEXT,
    "defaultTermsAndConditions" TEXT,
    "defaultNotes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);
