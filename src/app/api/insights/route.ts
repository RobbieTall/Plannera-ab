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
      const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
      const unreadOnly = searchParams.get("unread") === "true";

      const conditions = [eq(journalInsights.userId, user.dbUserId)];
      if (unreadOnly) conditions.push(eq(journalInsights.isRead, false));

      const insights = await journalDb
        .select()
        .from(journalInsights)
        .where(and(...conditions))
        .orderBy(desc(journalInsights.createdAt))
        .limit(limit);

      return NextResponse.json({ insights });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const body = await req.json();
      const { id } = body;

      await journalDb
        .update(journalInsights)
        .set({ isRead: true })
        .where(
          and(
            eq(journalInsights.id, id),
            eq(journalInsights.userId, user.dbUserId)
          )
        );

      return NextResponse.json({ updated: true });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
