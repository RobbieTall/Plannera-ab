import { NextResponse } from "next/server";

import { buildGoogleAutocompleteUrl, getGoogleConfig, type GooglePlacesResponse } from "@/lib/site-resolver";

const TEST_INPUT = "6 myola rd newport";

export async function GET() {
  const googleConfig = getGoogleConfig();
  if (!googleConfig.enabled) {
    return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
  }

  const url = buildGoogleAutocompleteUrl(TEST_INPUT, googleConfig.key);

  try {
    const response = await fetch(url.toString(), { cache: "no-store" });
    const bodyText = await response.text();
    let payload: GooglePlacesResponse | null = null;
    try {
      payload = bodyText ? (JSON.parse(bodyText) as GooglePlacesResponse) : null;
    } catch (error) {
      console.warn("[site-resolver-google-health-parse-error]", {
        provider: "google",
        message: (error as Error)?.message,
      });
    }

    const status = payload?.status ?? (response.ok ? "UNKNOWN_ERROR" : "REQUEST_FAILED");
    const ok = status === "OK" || status === "ZERO_RESULTS";

    return NextResponse.json(
      {
        ok,
        status,
        error_message: payload?.error_message ?? null,
        predictions_count: payload?.predictions?.length ?? 0,
      },
      { status: ok ? 200 : 503 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "REQUEST_FAILED",
        error_message: error instanceof Error ? error.message : String(error),
        predictions_count: 0,
      },
      { status: 503 },
    );
  }
}
