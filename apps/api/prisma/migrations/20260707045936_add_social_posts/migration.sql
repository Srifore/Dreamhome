-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('PENDING_REVIEW', 'POSTED', 'DISCARDED');

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "imagePath" TEXT NOT NULL,
    "status" "SocialPostStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "postedToInstagramAt" TIMESTAMP(3),
    "postedToFacebookAt" TIMESTAMP(3),
    "instagramError" TEXT,
    "facebookError" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
