import { NextRequest, NextResponse } from "next/server";
import { journalDb, journalUsers } from "../../../../db";
import { firebaseAuth } from "../../../../lib/firebase-admin";
import { handleApiError, ValidationError } from "../../../../lib/errors/error-handler";
import { withSecurity } from "../../../../lib/middleware/security";
import { calculateLifePath, calculateSoulUrge, calculateExpression } from "../../../../lib/numerology";
import { getSunSign } from "../../../../lib/astrology";
import { eq } from "drizzle-orm";

/** Derive all computed profile fields from raw inputs. */
function deriveProfileFields(birthDate?: string, displayName?: string) {
  return {
    ...(birthDate !== undefined && {
      birthDate,
      lifePath: calculateLifePath(birthDate),
      sunSign: getSunSign(birthDate),
    }),
    ...(displayName !== undefined && birthDate !== undefined && {
      soulUrge: calculateSoulUrge(displayName),
      expression: calculateExpression(displayName),
    }),
  };
}

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

      // Idempotent — return existing record if already registered.
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
          timezone,
          ...deriveProfileFields(birthDate, displayName),
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

      // When birth date or name changes, recompute derived numerology/astrology.
      // If only one changes we need the current value of the other from the DB.
      let resolvedBirthDate = birthDate;
      let resolvedDisplayName = displayName;

      if (
        (birthDate !== undefined || displayName !== undefined) &&
        !(birthDate !== undefined && displayName !== undefined)
      ) {
        const [current] = await journalDb
          .select({ birthDate: journalUsers.birthDate, displayName: journalUsers.displayName })
          .from(journalUsers)
          .where(eq(journalUsers.firebaseUid, decoded.uid))
          .limit(1);

        resolvedBirthDate ??= current?.birthDate ?? undefined;
        resolvedDisplayName ??= current?.displayName ?? undefined;
      }

      const [updated] = await journalDb
        .update(journalUsers)
        .set({
          ...(displayName !== undefined && { displayName }),
          ...(timezone !== undefined && { timezone }),
          ...(notificationsEnabled !== undefined && { notificationsEnabled }),
          ...deriveProfileFields(resolvedBirthDate, resolvedDisplayName),
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
