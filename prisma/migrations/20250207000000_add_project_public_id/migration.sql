-- Add publicId for external workspace routing
ALTER TABLE "Project" ADD COLUMN "publicId" TEXT;

UPDATE "Project"
SET "publicId" = concat('proj-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 18))
WHERE "publicId" IS NULL;

ALTER TABLE "Project" ALTER COLUMN "publicId" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "publicId"
  SET DEFAULT concat('proj-', substr(replace(gen_random_uuid()::text, '-', ''), 1, 18));

CREATE UNIQUE INDEX "Project_publicId_key" ON "Project"("publicId");
