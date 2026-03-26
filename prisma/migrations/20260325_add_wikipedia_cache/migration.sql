-- CreateTable
CREATE TABLE "WikipediaCache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cacheType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WikipediaCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WikipediaCache_cacheKey_key" ON "WikipediaCache"("cacheKey");

-- CreateIndex
CREATE INDEX "WikipediaCache_cacheKey_idx" ON "WikipediaCache"("cacheKey");

-- CreateIndex
CREATE INDEX "WikipediaCache_expiresAt_idx" ON "WikipediaCache"("expiresAt");
