import type { UserTier } from "@/types/workspace";

export const WORKSPACE_UPLOAD_LIMITS: Record<UserTier, number> = {
  guest: 1,
  free: 5,
  pro: 100,
};

export const TOOL_USAGE_LIMITS: Record<UserTier, number> = {
  guest: 0,
  free: 3,
  pro: 50,
};
