-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "manualUrl" TEXT;
