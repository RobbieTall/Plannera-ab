import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalInsights } from "../../../../db";
import { authenticateRequest } from "../../../../lib/auth";
import { handleApiError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { eq, and, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { searchParams } = new URL(req.url);
      const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
      const limit = Number.isNaN(rawLimit) ? 20 : Math.min(rawLimit, 50);
      const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
      const offset = Number.isNaN(rawOffset) ? 0 : Math.max(rawOffset, 0);
      const unreadOnly = searchParams.get("unread") === "true";

      const conditions = [eq(journalInsights.userId, user.dbUserId)];
      if (unreadOnly) conditions.push(eq(journalInsights.isRead, false));

      const insights = await journalDb
        .select()
        .from(journalInsights)
        .where(and(...conditions))
        .orderBy(desc(journalInsights.createdAt))
        .limit(limit)
        .offset(offset);

      return NextResponse.json({ insights, limit, offset });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
