import { NextResponse } from "next/server";

import { createMagicLinkToken } from "@/lib/auth";
import { getBaseUrl, sendMagicLinkEmail } from "@/lib/email";

const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && /.+@.+\..+/.test(value.trim());

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailInput = body?.email;

    if (!isValidEmail(emailInput)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const email = emailInput.trim().toLowerCase();
    const token = createMagicLinkToken(email);
    const baseUrl = getBaseUrl(request);
    const verifyUrl = `${baseUrl}/api/auth/verify?token=${encodeURIComponent(token)}`;

    await sendMagicLinkEmail(email, verifyUrl);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to generate magic link", error);
    return NextResponse.json({ error: "Unable to send magic link" }, { status: 500 });
  }
}
