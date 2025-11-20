import { NextResponse } from "next/server";

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
      { status: 200 }
    );
  }

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/autocomplete/json"
  );

  url.searchParams.set("input", "6 myola rd newport");
  url.searchParams.set("key", key);
  url.searchParams.set("components", "country:au");
  url.searchParams.set("types", "geocode");

  try {
    const res = await fetch(url.toString());
    const data = await res.json();

    return NextResponse.json(
      {
        ok: data.status === "OK" || data.status === "ZERO_RESULTS",
        status: data.status ?? "UNKNOWN",
        error_message: data.error_message ?? null,
        predictions_count: Array.isArray(data.predictions)
          ? data.predictions.length
          : 0,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        status: "FETCH_ERROR",
        error_message:
          err instanceof Error ? err.message : "Unknown fetch error",
        predictions_count: 0,
      },
      { status: 200 }
    );
  }
}
