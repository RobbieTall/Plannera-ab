-- Store parsed LEP data on projects
ALTER TABLE "Project"
ADD COLUMN "lepData" JSONB;
