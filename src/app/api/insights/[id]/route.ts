import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalInsights } from "../../../../../db";
import { authenticateRequest } from "../../../../../lib/auth";
import { handleApiError, NotFoundError } from "../../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../../lib/middleware/security";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecurity(req, async () => {
    try {
      const user = await authenticateRequest(req);
      const { id } = params;

      const [updated] = await journalDb
        .update(journalInsights)
        .set({ isRead: true })
        .where(
          and(
            eq(journalInsights.id, id),
            eq(journalInsights.userId, user.dbUserId)
          )
        )
        .returning();

      if (!updated) throw new NotFoundError("Insight");
      return NextResponse.json({ updated: true });
    } catch (err) {
      return handleApiError(err);
    }
  });
}
