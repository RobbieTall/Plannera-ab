-- Add createdAt to users for session tracking
ALTER TABLE "User"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
