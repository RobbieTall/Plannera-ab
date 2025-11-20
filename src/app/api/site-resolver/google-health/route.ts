import { NextResponse } from "next/server";

import { getGoogleConfig, requestGoogleAutocomplete, type GooglePlacesResponse } from "@/lib/site-resolver";

const TEST_INPUT = "6 myola rd newport";

export async function GET() {
  const googleConfig = getGoogleConfig();
  if (!googleConfig.enabled) {
    return NextResponse.json({ ok: false, reason: "missing_env" }, { status: 503 });
  }

  try {
    const { payload, googleStatus, googleErrorMessage } = await requestGoogleAutocomplete(TEST_INPUT, {
      key: googleConfig.key,
    });
    const predictionsCount = Array.isArray((payload as GooglePlacesResponse | null)?.suggestions)
      ? (payload as GooglePlacesResponse).suggestions!.length
      : 0;
    const ok = googleStatus === "OK" || googleStatus === "ZERO_RESULTS";

    return NextResponse.json(
      {
        ok,
        status: googleStatus,
        error_message: googleErrorMessage,
        predictions_count: predictionsCount,
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
