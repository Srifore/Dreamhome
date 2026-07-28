-- CreateEnum
CREATE TYPE "ReviewRequestStatus" AS ENUM ('REQUESTED', 'RECEIVED');

-- CreateTable
CREATE TABLE "ProductReview" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productUnitId" TEXT NOT NULL,
    "status" "ReviewRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "rating" INTEGER,
    "comment" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ProductReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductReview_productUnitId_key" ON "ProductReview"("productUnitId");

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReview" ADD CONSTRAINT "ProductReview_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
