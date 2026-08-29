const NSW_ZONING_LAYER_URL =
  "https://mapprod3.environment.nsw.gov.au/arcgis/rest/services/Planning/EPI_Primary_Planning_Layers/MapServer/2";

type FlightFixture = {
  id: "byron-sp3" | "kempsey-e2";
  lga: "Byron" | "Kempsey";
  expectedInstrument: string;
  expectedZone: string;
};

type ArcGisFeature = {
  attributes?: Record<string, unknown>;
  geometry?: {
    rings?: number[][][];
  };
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
  },
  {
    id: "kempsey-e2",
    lga: "Kempsey",
    expectedInstrument: "Kempsey Local Environmental Plan 2013",
    expectedZone: "E2",
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

type Point = {
  x: number;
  y: number;
};

const pointInRing = (point: Point, ring: readonly Point[]): boolean => {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];
    if (!currentPoint || !previousPoint) continue;
    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x;
    if (intersects) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (
  point: Point,
  rings: readonly (readonly Point[])[],
): boolean => {
  let inside = false;
  for (const ring of rings) {
    if (pointInRing(point, ring)) inside = !inside;
  }
  return inside;
};

const distanceToSegment = (
  point: Point,
  start: Point,
  end: Point,
): number => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
        (dx * dx + dy * dy),
    ),
  );
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.y - (start.y + projection * dy),
  );
};

const interiorPoint = (
  geometry: ArcGisFeature["geometry"],
): Point | null => {
  const rings = (geometry?.rings ?? [])
    .map((ring) =>
      ring
        .filter(
          (coordinate) =>
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            Number.isFinite(coordinate[0]) &&
            Number.isFinite(coordinate[1]),
        )
        .map((coordinate) => ({
          x: coordinate[0] as number,
          y: coordinate[1] as number,
        })),
    )
    .filter((ring) => ring.length >= 4);
  const points = rings.flat();
  if (rings.length === 0 || points.length === 0) return null;

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  if (![minX, maxX, minY, maxY].every(Number.isFinite)) return null;

  let best: { point: Point; clearance: number } | null = null;
  const gridSize = 31;
  for (let xIndex = 0; xIndex < gridSize; xIndex += 1) {
    for (let yIndex = 0; yIndex < gridSize; yIndex += 1) {
      const point = {
        x: minX + ((xIndex + 0.5) / gridSize) * (maxX - minX),
        y: minY + ((yIndex + 0.5) / gridSize) * (maxY - minY),
      };
      if (!pointInPolygon(point, rings)) continue;

      let clearance = Number.POSITIVE_INFINITY;
      for (const ring of rings) {
        for (let index = 0; index < ring.length - 1; index += 1) {
          const start = ring[index];
          const end = ring[index + 1];
          if (!start || !end) continue;
          clearance = Math.min(
            clearance,
            distanceToSegment(point, start, end),
          );
        }
      }
      if (!best || clearance > best.clearance) {
        best = { point, clearance };
      }
    }
  }

  return best?.point ?? null;
};

const fetchArcGis = async (
  parameters: Record<string, string>,
): Promise<ArcGisQueryResponse> => {
  const url = new URL(`${NSW_ZONING_LAYER_URL}/query`);
  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, value);
  }

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

const selectOfficialSample = async (fixture: FlightFixture) => {
  const escapedInstrument = fixture.expectedInstrument.replace(/'/g, "''");
  const escapedZone = fixture.expectedZone.replace(/'/g, "''");
  const payload = await fetchArcGis({
    f: "json",
    where: `EPI_NAME = '${escapedInstrument}' AND SYM_CODE = '${escapedZone}'`,
    outFields: "OBJECTID,EPI_NAME,SYM_CODE,LAY_CLASS",
    returnGeometry: "true",
    outSR: "4326",
    geometryPrecision: "7",
    orderByFields: "OBJECTID ASC",
    resultRecordCount: "1",
  });

  if (payload.error) {
    throw new Error("official zoning service returned an ArcGIS error");
  }

  const features = payload.features ?? [];
  if (features.length !== 1) {
    throw new Error(
      features.length === 0
        ? "no authoritative zone sample resolved"
        : `ambiguous sample selection returned ${features.length} features`,
    );
  }

  const feature = features[0];
  const attributes = feature?.attributes;
  const point = interiorPoint(feature?.geometry);
  if (!attributes) {
    throw new Error("authoritative sample attributes missing");
  }
  if (
    !point ||
    point.x < 140 ||
    point.x > 154 ||
    point.y < -38 ||
    point.y > -28
  ) {
    throw new Error("authoritative sample has no safe interior point");
  }

  const identifier = featureIdentifier(attributes);
  if (!identifier) {
    throw new Error("authoritative sample OBJECTID missing");
  }

  return {
    coordinates: {
      lat: point.y,
      lng: point.x,
    },
    identifier,
  };
};

const validateFixture = async (fixture: FlightFixture) => {
  if (!NSW_ZONING_LAYER_URL.startsWith("https://")) {
    throw new Error("official zoning source is not HTTPS");
  }

  const sample = await selectOfficialSample(fixture);
  const payload = await fetchArcGis({
    f: "json",
    geometry: `${sample.coordinates.lng},${sample.coordinates.lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "OBJECTID,EPI_NAME,SYM_CODE,LAY_CLASS",
    returnGeometry: "false",
    where: "1=1",
  });

  if (payload.error) {
    throw new Error("official zoning service returned an ArcGIS error");
  }

  const features = payload.features ?? [];
  if (features.length === 0) {
    throw new Error("sample centroid did not resolve a zoning feature");
  }
  if (features.length !== 1) {
    throw new Error(
      `ambiguous centroid intersection returned ${features.length} features`,
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
  if (identifier !== sample.identifier) {
    throw new Error("centroid round-trip resolved a different feature");
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
