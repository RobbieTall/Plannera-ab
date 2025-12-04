import { NextResponse } from "next/server";

import { createMagicLinkToken } from "@/lib/auth";
import { getBaseUrl, sendMagicLinkEmail } from "@/lib/email";

const isValidEmail = (value: unknown): value is string =>
  typeof value === "string" && /.+@.+\..+/.test(value.trim());

const resolveProjectId = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
};

const resolveCallbackPath = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }

  return trimmed;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const emailInput = body?.email;

    if (!isValidEmail(emailInput)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const email = emailInput.trim().toLowerCase();
    const callbackUrl = resolveCallbackPath(body?.callbackUrl);
    const projectId = resolveProjectId(body?.projectId);
    const token = createMagicLinkToken(email);
    const baseUrl = getBaseUrl(request);
    const verifyUrl = new URL(`/api/auth/verify?token=${encodeURIComponent(token)}`, baseUrl);

    if (callbackUrl) {
      verifyUrl.searchParams.set("callbackUrl", callbackUrl);
    }

    if (projectId) {
      verifyUrl.searchParams.set("projectId", projectId);
    }

    await sendMagicLinkEmail(email, verifyUrl.toString());

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to generate magic link", error);
    return NextResponse.json({ error: "Unable to send magic link" }, { status: 500 });
  }
}
