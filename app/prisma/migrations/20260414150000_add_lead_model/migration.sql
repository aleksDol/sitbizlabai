-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "analysisText" TEXT,
    "lossesText" TEXT,
    "solutionOfferText" TEXT,
    "siteType" TEXT,
    "hasRepeatSales" BOOLEAN,
    "trafficSources" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "managerComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

