const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function getBaseUrl(request?: Request): string {
  const appUrl = process.env.APP_URL;
  if (appUrl && appUrl.length > 0) {
    return appUrl.replace(/\/+$/, "");
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl && vercelUrl.length > 0) {
    return `https://${vercelUrl}`.replace(/\/+$/, "");
  }

  if (request) {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`.replace(/\/+$/, "");
  }

  throw new Error("Base URL could not be determined");
}

const buildEmailBody = (to: string, magicLink: string) => ({
  from: process.env.EMAIL_FROM ?? "no-reply@plannera.ai",
  to,
  subject: "Your sign-in link for Plannera",
  html: `<p>Click the link below to sign in.</p><p><a href="${magicLink}">${magicLink}</a></p>`,
});

export const sendMagicLinkEmail = async (email: string, magicLink: string): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(`[auth] RESEND_API_KEY not configured. Magic link for ${email}: ${magicLink}`);
    return;
  }

  const body = buildEmailBody(email, magicLink);

  const requestInit: RequestInit = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };

  const response = await fetch(RESEND_ENDPOINT, requestInit);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send magic link email: ${response.status} ${errorText}`);
  }
};
