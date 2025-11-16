import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { setTimeout as delay } from "node:timers/promises";

import type { InstrumentConfig, InstrumentFetchResult } from "./types";

const USER_AGENT = "PlanneraLegislationFetcher/1.0 (+https://plannera.ai)";
const DEFAULT_TIMEOUT_MS = Number(process.env.LEGISLATION_FETCH_TIMEOUT_MS ?? 15000);
const MAX_RETRIES = Number(process.env.LEGISLATION_FETCH_RETRIES ?? 2);
const RETRY_DELAY_MS = Number(process.env.LEGISLATION_FETCH_RETRY_DELAY_MS ?? 750);

const readFileFromUrl = async (fileUrl: string) => {
  const filePath = fileURLToPath(fileUrl);
  return fs.readFile(filePath, "utf-8");
};

const readFixture = async (fixturePath: string) => {
  if (path.isAbsolute(fixturePath)) {
    return fs.readFile(fixturePath, "utf-8");
  }

  const normalizedPath = fixturePath.replace(/^[./]+/, "");
  const isPublicAsset = normalizedPath.startsWith("public/");
  const absolutePath = isPublicAsset
    ? path.resolve(process.cwd(), "public", normalizedPath.replace(/^public\//, ""))
    : path.resolve(process.cwd(), normalizedPath);

  return fs.readFile(absolutePath, "utf-8");
};

const loadFromFixture = async (config: InstrumentConfig): Promise<InstrumentFetchResult> => {
  if (!config.fixtureFile) {
    throw new Error(`No fixture configured for ${config.slug}`);
  }
  const html = await readFixture(config.fixtureFile);
  return {
    html,
    fetchedAt: new Date(),
    status: 200,
    sourceUrl: config.fixtureFile,
    usedFixture: true,
  };
};

const performHttpFetch = async (url: string): Promise<{ html: string; status: number }> => {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml",
            "Accept-Encoding": "identity",
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const html = await response.text();
        return { html, status: response.status };
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

export const fetchInstrumentHtml = async (
  config: InstrumentConfig,
): Promise<InstrumentFetchResult> => {
  const preferFixtures = process.env.LEGISLATION_USE_FIXTURES === "true";

  if (preferFixtures && config.fixtureFile) {
    return loadFromFixture(config);
  }

  if (config.sourceUrl.startsWith("file://")) {
    const html = await readFileFromUrl(config.sourceUrl);
    return {
      html,
      fetchedAt: new Date(),
      status: 200,
      sourceUrl: config.sourceUrl,
      usedFixture: true,
    };
  }

  try {
    const { html, status } = await performHttpFetch(config.sourceUrl);
    return {
      html,
      fetchedAt: new Date(),
      status,
      sourceUrl: config.sourceUrl,
      usedFixture: false,
    };
  } catch (error) {
    if (config.fixtureFile) {
      console.warn(`Falling back to fixture for ${config.slug}: ${String(error)}`);
      return loadFromFixture(config);
    }
    throw error;
  }
};
