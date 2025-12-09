"use server";

type ActionState = {
  ok?: boolean;
  error?: string;
  result?: unknown;
  [key: string]: unknown;
};

export async function triggerByronIngest(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const adminToken = process.env.ADMIN_ACCESS_TOKEN;
  const submittedToken = formData.get("token");

  if (!adminToken || submittedToken !== adminToken) {
    return { ok: false, error: "unauthorized" };
  }

  const baseUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = `${baseUrl}/api/admin/ingest-dcp?lga=BYRON&token=${encodeURIComponent(adminToken)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lga: "BYRON" }),
  });

  const data: ActionState = await res.json();
  return data;
}
