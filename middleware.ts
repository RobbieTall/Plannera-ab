import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createAnonymousSession, decodeSessionCookie, serializeSession, SESSION_COOKIE_NAME } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const existingCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = decodeSessionCookie(existingCookie) ?? createAnonymousSession();
  const serialized = serializeSession(session);

  const response = NextResponse.next();

  if (!existingCookie || existingCookie !== serialized.value) {
    response.cookies.set(serialized.name, serialized.value, serialized.attributes);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
