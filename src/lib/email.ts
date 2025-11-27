const RESEND_ENDPOINT = "https://api.resend.com/emails";

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
