-- Add foreign key constraint linking uploads to their project/workspace parent
ALTER TABLE "WorkspaceUpload"
ADD CONSTRAINT "WorkspaceUpload_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
