-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN "lepSourceRefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
