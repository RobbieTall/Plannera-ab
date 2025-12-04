import { NSW_SPATIAL_VIEWER_URL } from "../lga-map-registry";

type MapResolutionSource = "primary" | "fallback" | "nsw_spatial_viewer" | "none";

export type MapResolutionResult = {
  resolvedUrl: string | null;
  attemptedUrls: string[];
  fallbackUsed: boolean;
  source: MapResolutionSource;
};

const REQUEST_TIMEOUT_MS = 3500;

async function fetchWithTimeout(url: string, method: "HEAD" | "GET" = "HEAD"): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method,
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function isUrlReachable(url: string): Promise<boolean> {
  try {
    const headResponse = await fetchWithTimeout(url, "HEAD");
    if (headResponse.ok) return true;

    if (headResponse.status === 405 || headResponse.status === 501) {
      const getResponse = await fetchWithTimeout(url, "GET");
      return getResponse.ok;
    }

    return false;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return false;
    }
    return false;
  }
}

export async function resolveMapUrl({
  primaryUrl,
  fallbackUrls = [],
  nswSpatialViewerUrl = NSW_SPATIAL_VIEWER_URL,
}: {
  primaryUrl: string | null | undefined;
  fallbackUrls?: string[];
  nswSpatialViewerUrl?: string;
}): Promise<MapResolutionResult> {
  const attemptedUrls: string[] = [];
  const candidates = [primaryUrl, ...fallbackUrls].filter(Boolean) as string[];

  for (const candidate of candidates) {
    attemptedUrls.push(candidate);
    // eslint-disable-next-line no-await-in-loop
    const reachable = await isUrlReachable(candidate);
    if (reachable) {
      const usingFallback = candidate !== primaryUrl;
      return {
        resolvedUrl: candidate,
        attemptedUrls,
        fallbackUsed: usingFallback,
        source: usingFallback ? "fallback" : "primary",
      };
    }
  }

  attemptedUrls.push(nswSpatialViewerUrl);

  return {
    resolvedUrl: nswSpatialViewerUrl,
    attemptedUrls,
    fallbackUsed: true,
    source: nswSpatialViewerUrl ? "nsw_spatial_viewer" : "none",
  };
}
