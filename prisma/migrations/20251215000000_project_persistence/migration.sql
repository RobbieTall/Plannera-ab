-- AlterTable
ALTER TABLE "Project"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "sessionId" TEXT,
  ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Untitled project',
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "zoning" TEXT;

-- CreateIndex
CREATE INDEX "Project_sessionId_idx" ON "Project"("sessionId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
