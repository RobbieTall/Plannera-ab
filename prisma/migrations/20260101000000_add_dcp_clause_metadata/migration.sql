-- CreateTable
CREATE TABLE "DCPClause" (
    "id" TEXT NOT NULL,
    "lgaCode" TEXT NOT NULL,
    "instrumentSlug" TEXT,
    "ref" TEXT,
    "title" TEXT,
    "headingPath" TEXT[],
    "parentRef" TEXT,
    "depth" INTEGER,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "topicTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numericMeta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DCPClause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DCPClause_lgaCode_idx" ON "DCPClause"("lgaCode");

-- CreateIndex
CREATE INDEX "DCPClause_instrumentSlug_idx" ON "DCPClause"("instrumentSlug");

-- CreateIndex
CREATE INDEX "DCPClause_ref_idx" ON "DCPClause"("ref");
