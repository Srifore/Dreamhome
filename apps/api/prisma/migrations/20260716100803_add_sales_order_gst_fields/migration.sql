-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "cgstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "igstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "placeOfSupplyState" TEXT,
ADD COLUMN     "roundingAdjustment" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "termsAndConditions" TEXT;

-- AlterTable
ALTER TABLE "SalesOrderItem" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gstRate" DECIMAL(5,2),
ADD COLUMN     "hsnCode" TEXT,
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;
