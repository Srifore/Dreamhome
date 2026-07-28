-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'FACEBOOK');

-- CreateTable
CREATE TABLE "IntegrationSetting" (
    "id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "configEncrypted" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSetting_provider_key" ON "IntegrationSetting"("provider");
