"use server";

export type ActionState = {
  status?: number;
  error?: string;
  result?: unknown;
};

export const initialState: ActionState = {};

const resolveOrigin = (formData: FormData) => {
  const formOrigin = formData.get("origin");

  if (typeof formOrigin === "string" && formOrigin.length > 0) return formOrigin;

  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return "http://localhost:3000";
};

export async function triggerByronIngest(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const submittedToken = formData.get("token");

  if (!adminToken) {
    return { status: 401, error: "ADMIN_ACCESS_TOKEN not configured" };
  }

  if (!submittedToken || submittedToken !== adminToken) {
    return { status: 401, error: "Unauthorized" };
  }

  const origin = resolveOrigin(formData);

  const response = await fetch(`${origin}/api/admin/ingest-dcp?lga=BYRON`, {
    method: "POST",
    headers: {
      "x-admin-token": adminToken,
    },
  });

  let result: unknown = null;

  try {
    result = await response.json();
  } catch (error) {
    console.error("Failed to parse ingest response", error);
  }

  if (!response.ok) {
    const errorMessage =
      typeof result === "object" && result && "error" in (result as Record<string, unknown>)
        ? String((result as Record<string, unknown>).error)
        : "dcp_ingest_failed";

    return { status: response.status, error: errorMessage, result };
  }

  return { status: response.status, result };
}
