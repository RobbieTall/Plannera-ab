import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  createMiddlewareAnonymousSession,
  decodeMiddlewareSessionCookie,
  MIDDLEWARE_SESSION_COOKIE_NAME,
  serializeMiddlewareSession,
} from "@/lib/middleware-session";
import {
  ITEM74H_VISUAL_ACCEPTANCE_PATH,
  item74hVisualAcceptanceRequestAllowed,
} from "@/lib/item74h-visual-acceptance";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === ITEM74H_VISUAL_ACCEPTANCE_PATH &&
    !item74hVisualAcceptanceRequestAllowed(pathname, process.env)
  ) {
    return new NextResponse("Not Found", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  if (pathname.startsWith("/api/projects/ensure")) {
    return NextResponse.next();
  }

  const existingCookie = request.cookies.get(
    MIDDLEWARE_SESSION_COOKIE_NAME,
  )?.value;
  const session =
    (await decodeMiddlewareSessionCookie(existingCookie)) ??
    createMiddlewareAnonymousSession();
  const serialized = await serializeMiddlewareSession(session);
  const response = NextResponse.next();

  if (!existingCookie || existingCookie !== serialized.value) {
    response.cookies.set(serialized.name, serialized.value, serialized.attributes);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
