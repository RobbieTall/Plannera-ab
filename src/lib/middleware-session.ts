const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEVELOPMENT_SECRET = "development-only-change-me";

export const MIDDLEWARE_SESSION_COOKIE_NAME = "np_session";

export type MiddlewareSessionState = {
  id: string;
  userId?: string | null;
  createdAt: number;
};

type SessionCookieEnvironment = Record<string, string | undefined>;

function sessionSecret(env: SessionCookieEnvironment = process.env) {
  return env.MAGIC_LINK_SECRET ?? env.NEXTAUTH_SECRET ?? DEVELOPMENT_SECRET;
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function stringToBase64Url(value: string) {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToBytes(value: string) {
  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signatureFor(
  payloadEncoded: string,
  env: SessionCookieEnvironment = process.env,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret(env)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(payloadEncoded)),
  );
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }
  return mismatch === 0;
}

export async function decodeMiddlewareSessionCookie(
  token: string | undefined,
  env: SessionCookieEnvironment = process.env,
): Promise<MiddlewareSessionState | null> {
  if (!token) return null;
  const [payloadEncoded, signatureEncoded, extra] = token.split(".");
  if (!payloadEncoded || !signatureEncoded || extra) return null;

  try {
    const expected = await signatureFor(payloadEncoded, env);
    const supplied = base64UrlToBytes(signatureEncoded);
    if (!equalBytes(expected, supplied)) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payloadEncoded)),
    ) as MiddlewareSessionState;
    if (
      typeof payload.id !== "string" ||
      payload.id.length === 0 ||
      !Number.isFinite(payload.createdAt) ||
      (payload.userId !== undefined &&
        payload.userId !== null &&
        typeof payload.userId !== "string")
    ) {
      return null;
    }

    return {
      id: payload.id,
      userId: payload.userId ?? null,
      createdAt: payload.createdAt,
    };
  } catch {
    return null;
  }
}

export function createMiddlewareAnonymousSession(): MiddlewareSessionState {
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
}

export async function serializeMiddlewareSession(
  session: MiddlewareSessionState,
  env: SessionCookieEnvironment = process.env,
) {
  const payloadEncoded = stringToBase64Url(JSON.stringify(session));
  const signature = bytesToBase64Url(await signatureFor(payloadEncoded, env));

  return {
    name: MIDDLEWARE_SESSION_COOKIE_NAME,
    value: `${payloadEncoded}.${signature}`,
    attributes: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    },
  };
}
