import { NextResponse } from "next/server";

import { requestGoogleAutocomplete, type GooglePlacesResponse } from "@/lib/site-resolver";

export async function GET() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        status: "MISSING_KEY",
        error_message: "GOOGLE_MAPS_API_KEY is not set",
        predictions_count: 0,
      },
      { status: 200 },
    );
  }

  try {
    const { payload, googleStatus, googleErrorMessage } = await requestGoogleAutocomplete(
      "6 myola rd newport",
      { key },
    );
    const predictionsCount = Array.isArray((payload as GooglePlacesResponse | null)?.suggestions)
      ? (payload as GooglePlacesResponse).suggestions!.length
      : 0;

    return NextResponse.json(
      {
        ok: googleStatus === "OK" || googleStatus === "ZERO_RESULTS",
        status: process.env.GOOGLE_MAPS_API_KEY ? googleStatus : "MISSING_KEY",
        error_message: process.env.GOOGLE_MAPS_API_KEY ? googleErrorMessage : "GOOGLE_MAPS_API_KEY is not set",
        predictions_count: predictionsCount,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        status: "FETCH_ERROR",
        error_message: err instanceof Error ? err.message : "Unknown fetch error",
        predictions_count: 0,
      },
      { status: 200 },
    );
  }
}
