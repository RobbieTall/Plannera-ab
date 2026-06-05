-- CreateEnum
CREATE TYPE "ProjectNotificationType" AS ENUM ('LGA_SEARCHABLE_READY');

-- CreateTable
CREATE TABLE "ProjectNotification" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "ProjectNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lgaCode" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectNotification_projectId_type_lgaCode_key" ON "ProjectNotification"("projectId", "type", "lgaCode");

-- CreateIndex
CREATE INDEX "ProjectNotification_projectId_readAt_idx" ON "ProjectNotification"("projectId", "readAt");

-- AddForeignKey
ALTER TABLE "ProjectNotification" ADD CONSTRAINT "ProjectNotification_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
