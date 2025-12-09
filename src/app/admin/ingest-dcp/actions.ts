"use server";

type ActionState = {
  status?: number;
  error?: string;
  result?: unknown;
};

const resolveOrigin = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
};

export async function triggerByronIngest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const submitted = formData.get("token");

  if (!adminToken) {
    return { status: 401, error: "ADMIN_ACCESS_TOKEN not configured" };
  }

  if (submitted !== adminToken) {
    return { status: 401, error: "Invalid token" };
  }

  const response = await fetch(`${resolveOrigin()}/api/admin/ingest-dcp?lga=BYRON`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lga: "BYRON", token: adminToken }),
  });

  try {
    const result = await response.json();
    return { status: response.status, result };
  } catch (error) {
    console.error("Failed to parse ingest response", error);
    return { status: response.status, error: "Failed to parse ingest response" };
  }
}
