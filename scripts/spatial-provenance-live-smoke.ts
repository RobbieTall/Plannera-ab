const NSW_ZONING_LAYER_URL =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2";

type FlightFixture = {
  id: "byron-sp3" | "kempsey-e2";
  lga: "Byron" | "Kempsey";
  expectedInstrument: string;
  expectedZone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
};

type ArcGisQueryResponse = {
  features?: ArcGisFeature[];
  error?: {
    message?: string;
  };
};

const fixtures: readonly FlightFixture[] = [
  {
    id: "byron-sp3",
    lga: "Byron",
    expectedInstrument: "Byron Local Environmental Plan 2014",
    expectedZone: "SP3",
    coordinates: {
      lat: -28.6508,
      lng: 153.612,
    },
  },
  {
    id: "kempsey-e2",
    lga: "Kempsey",
    expectedInstrument: "Kempsey Local Environmental Plan 2013",
    expectedZone: "E2",
    coordinates: {
      lat: -31.078,
      lng: 152.84,
    },
  },
] as const;

const textAttribute = (
  attributes: Record<string, unknown>,
  name: string,
): string | null => {
  const value = attributes[name];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const featureIdentifier = (
  attributes: Record<string, unknown>,
): string | null => {
  const value = attributes.OBJECTID;
  if (typeof value === "number" && Number.isFinite(value)) {
    return `OBJECTID:${value}`;
  }
  if (typeof value === "string" && value.trim()) {
    return `OBJECTID:${value.trim()}`;
  }
  return null;
};

const fetchFixture = async (
  fixture: FlightFixture,
): Promise<ArcGisQueryResponse> => {
  const url = new URL(`${NSW_ZONING_LAYER_URL}/query`);
  url.searchParams.set("f", "json");
  url.searchParams.set(
    "geometry",
    `${fixture.coordinates.lng},${fixture.coordinates.lat}`,
  );
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set(
    "outFields",
    "OBJECTID,EPI_NAME,SYM_CODE,LAY_CLASS",
  );
  url.searchParams.set("returnGeometry", "false");
  url.searchParams.set("where", "1=1");

  let lastStatus: number | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      lastStatus = response.status;
      if (response.ok) {
        return (await response.json()) as ArcGisQueryResponse;
      }
    } catch {
      lastStatus = null;
    }

    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }

  throw new Error(
    lastStatus === null
      ? "official zoning service unavailable"
      : `official zoning service returned HTTP ${lastStatus}`,
  );
};

const validateFixture = async (fixture: FlightFixture) => {
  if (!NSW_ZONING_LAYER_URL.startsWith("https://")) {
    throw new Error("official zoning source is not HTTPS");
  }

  const payload = await fetchFixture(fixture);
  if (payload.error) {
    throw new Error("official zoning service returned an ArcGIS error");
  }

  const features = payload.features ?? [];
  if (features.length === 0) {
    throw new Error("no zoning feature resolved");
  }
  if (features.length !== 1) {
    throw new Error(
      `ambiguous zoning intersection returned ${features.length} features`,
    );
  }

  const attributes = features[0]?.attributes;
  if (!attributes) {
    throw new Error("zoning feature attributes missing");
  }

  const instrument = textAttribute(attributes, "EPI_NAME");
  const zone = textAttribute(attributes, "SYM_CODE");
  const identifier = featureIdentifier(attributes);

  if (instrument !== fixture.expectedInstrument) {
    throw new Error(
      `instrument mismatch: expected ${fixture.expectedInstrument}, received ${instrument ?? "missing"}`,
    );
  }
  if (zone !== fixture.expectedZone) {
    throw new Error(
      `zone mismatch: expected ${fixture.expectedZone}, received ${zone ?? "missing"}`,
    );
  }
  if (!identifier) {
    throw new Error("OBJECTID provenance missing");
  }

  return {
    fixture: fixture.id,
    lga: fixture.lga,
    instrument,
    zone,
    featureIdentifier: identifier,
    source: NSW_ZONING_LAYER_URL,
    checkedAt: new Date().toISOString(),
  };
};

const main = async () => {
  const evidence = [];
  for (const fixture of fixtures) {
    try {
      evidence.push(await validateFixture(fixture));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown validation error";
      throw new Error(`${fixture.id}: ${message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        gate: "spatial-provenance-live",
        status: "ready",
        evidence,
      },
      null,
      2,
    ),
  );
  console.log(
    `SPATIAL PROVENANCE LIVE READY: ${evidence.length}/${fixtures.length}`,
  );
};

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "unknown live smoke failure";
  console.error(`SPATIAL PROVENANCE LIVE RED: ${message}`);
  process.exitCode = 1;
});
