import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import { createTransport } from "nodemailer";

import { prisma } from "@/lib/prisma";

const fromAddress = process.env.EMAIL_FROM;
const smtpHost = process.env.EMAIL_SERVER_HOST;
const smtpPort = process.env.EMAIL_SERVER_PORT
  ? Number(process.env.EMAIL_SERVER_PORT)
  : undefined;
const smtpUser = process.env.EMAIL_SERVER_USER;
const smtpPassword = process.env.EMAIL_SERVER_PASSWORD;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
  },
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        session.user.plan = (user as { plan?: string | null }).plan ?? session.user.plan ?? "free";
        if ((user as { subscriptionTier?: string | null }).subscriptionTier) {
          session.user.subscriptionTier = (user as { subscriptionTier?: string | null }).subscriptionTier ?? null;
        }
      }
      return session;
    },
  },
  providers: [
    EmailProvider({
      from: fromAddress,
      sendVerificationRequest: async ({ identifier, url }) => {
        if (!fromAddress || !smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
          console.error(
            "Email provider is not fully configured. Set EMAIL_FROM and EMAIL_SERVER_* env vars before sending emails.",
          );
          throw new Error("Email provider configuration is incomplete");
        }

        const transport = createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        const result = await transport.sendMail({
          to: identifier,
          from: fromAddress,
          subject: "Sign in to Plannera",
          text: `Sign in by clicking on the following link: ${url}`,
          html: `<p>Sign in by clicking on the following link:</p><p><a href="${url}">Sign in</a></p>`,
        });

        const failed = result.rejected.concat(result.pending).filter(Boolean);
        if (failed.length) {
          throw new Error(`Email(s) (${failed.join(", ")}) could not be sent`);
        }
      },
    }),
  ],
};

export const MAGIC_LINK_EXPIRY_MS = 15 * 60 * 1000;
export const SESSION_COOKIE_NAME = "np_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

type SignedTokenPayload = Record<string, unknown>;

export type SessionState = {
  id: string;
  userId?: string | null;
  createdAt: number;
};

export type MagicLinkTokenPayload = {
  email: string;
  exp: number;
};

const resolveMagicLinkSecret = () => {
  const secret = process.env.MAGIC_LINK_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (!secret) {
    console.warn("MAGIC_LINK_SECRET is not configured. Falling back to a development-only secret.");
    return "development-insecure-magic-link-secret";
  }

  return secret;
};

const encodeBase64Url = (value: string) => Buffer.from(value).toString("base64url");

const decodeBase64Url = (value: string) => Buffer.from(value, "base64url").toString();

const signPayload = (payload: SignedTokenPayload): string => {
  const secret = resolveMagicLinkSecret();

  const payloadString = JSON.stringify(payload);
  const payloadEncoded = encodeBase64Url(payloadString);
  const signature = createHmac("sha256", secret).update(payloadEncoded).digest("base64url");

  return `${payloadEncoded}.${signature}`;
};

const safeCompare = (a: string, b: string) => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
};

const verifySignedToken = <T extends SignedTokenPayload>(token: string): T | null => {
  const secret = resolveMagicLinkSecret();

  if (!token.includes(".")) {
    return null;
  }

  const [rawPayload, signature] = token.split(".");
  if (!rawPayload || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", secret).update(rawPayload).digest("base64url");
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(decodeBase64Url(rawPayload)) as T;
    return parsedPayload;
  } catch (error) {
    console.error("Failed to parse signed token payload", error);
    return null;
  }
};

export const createMagicLinkToken = (email: string): string => {
  const payload: MagicLinkTokenPayload = {
    email,
    exp: Date.now() + MAGIC_LINK_EXPIRY_MS,
  };

  return signPayload(payload);
};

export const verifyMagicLinkToken = (token: string): MagicLinkTokenPayload | null => {
  const payload = verifySignedToken<MagicLinkTokenPayload>(token);

  if (!payload || typeof payload.email !== "string" || typeof payload.exp !== "number") {
    return null;
  }

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
};

export const decodeSessionCookie = (value: string | undefined): SessionState | null => {
  if (!value) {
    return null;
  }

  const payload = verifySignedToken<SessionState>(value);
  if (!payload || typeof payload.id !== "string" || typeof payload.createdAt !== "number") {
    return null;
  }

  return {
    id: payload.id,
    userId: payload.userId ?? null,
    createdAt: payload.createdAt,
  };
};

export const createAnonymousSession = (): SessionState => ({
  id: randomUUID(),
  createdAt: Date.now(),
});

export const serializeSession = (session: SessionState) => ({
  name: SESSION_COOKIE_NAME,
  value: signPayload(session),
  attributes: {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
});

export const attachUserToSession = (session: SessionState, userId: string): SessionState =>
  session.userId === userId ? session : { ...session, userId };
