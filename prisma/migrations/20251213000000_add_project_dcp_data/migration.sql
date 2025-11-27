-- Store parsed DCP data on projects
ALTER TABLE "Project"
ADD COLUMN "dcpData" JSONB;
