-- Prepared only: execute in a separately authorised isolated Preview migration step.
-- Do not run this migration from an application build or against Production.
ALTER TYPE "ArtefactType" ADD VALUE IF NOT EXISTS 'working_see';
