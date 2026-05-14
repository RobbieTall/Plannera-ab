import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalUsers } from "../../../../db";
import { firebaseAuth } from "../../../../lib/firebase-admin";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new ValidationError("Missing authorization header");
      }

      const decoded = await firebaseAuth.verifyIdToken(authHeader.slice(7));
      const body = await req.json();
      const { displayName, birthDate, timezone = "UTC" } = body;

      const existing = await journalDb
        .select()
        .from(journalUsers)
        .where(eq(journalUsers.firebaseUid, decoded.uid))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(existing[0], { status: 200 });
      }

      const [created] = await journalDb
        .insert(journalUsers)
        .values({
          firebaseUid: decoded.uid,
          email: decoded.email ?? "",
          displayName,
          birthDate,
          timezone,
        })
        .returning();

      return NextResponse.json(created, { status: 201 });
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function GET(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new ValidationError("Missing authorization header");
      }

      const decoded = await firebaseAuth.verifyIdToken(authHeader.slice(7));
      const users = await journalDb
        .select()
        .from(journalUsers)
        .where(eq(journalUsers.firebaseUid, decoded.uid))
        .limit(1);

      if (users.length === 0) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(users[0]);
    } catch (err) {
      return handleApiError(err);
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withSecurity(req, async () => {
    try {
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        throw new ValidationError("Missing authorization header");
      }

      const decoded = await firebaseAuth.verifyIdToken(authHeader.slice(7));
      const body = await req.json();
      const { displayName, birthDate, timezone, notificationsEnabled } = body;

      const [updated] = await journalDb
        .update(journalUsers)
        .set({
          ...(displayName !== undefined && { displayName }),
          ...(birthDate !== undefined && { birthDate }),
          ...(timezone !== undefined && { timezone }),
          ...(notificationsEnabled !== undefined && { notificationsEnabled }),
          updatedAt: new Date(),
        })
        .where(eq(journalUsers.firebaseUid, decoded.uid))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json(updated);
    } catch (err) {
      return handleApiError(err);
    }
  });
}
