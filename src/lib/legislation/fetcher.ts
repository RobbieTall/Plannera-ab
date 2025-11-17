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

const PUBLIC_FIXTURE_BASE_URL =
  process.env.LEGISLATION_PUBLIC_FIXTURE_BASE_URL ?? "https://plannera-ab.vercel.app/";

const fetchPublicFixture = async (publicPath: string) => {
  const relativePath = publicPath.replace(/^public\//, "");
  const url = new URL(relativePath, PUBLIC_FIXTURE_BASE_URL);
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/xml,text/xml;q=0.9,application/xhtml+xml;q=0.8",
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch public fixture ${url.toString()}: HTTP ${response.status}`);
  }
  return response.text();
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

  if (!isPublicAsset) {
    return fs.readFile(absolutePath, "utf-8");
  }

  try {
    return await fs.readFile(absolutePath, "utf-8");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code && err.code !== "ENOENT") {
      throw err;
    }
    return fetchPublicFixture(normalizedPath);
  }
};

const detectFormat = (content: string): InstrumentFetchResult["format"] =>
  /<html|<!DOCTYPE html/i.test(content) ? "html" : "xml";

const loadFromFixture = async (config: InstrumentConfig): Promise<InstrumentFetchResult> => {
  if (!config.fixtureFile) {
    throw new Error(`No fixture configured for ${config.slug}`);
  }
  const document = await readFixture(config.fixtureFile);
  return {
    document,
    fetchedAt: new Date(),
    status: 200,
    sourceUrl: config.fixtureFile,
    usedFixture: true,
    format: detectFormat(document),
  };
};

const performHttpFetch = async (url: string): Promise<{ document: string; status: number }> => {
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
            Accept: "application/xml,text/xml;q=0.9,application/xhtml+xml;q=0.8",
            "Accept-Encoding": "identity",
          },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const document = await response.text();
        return { document, status: response.status };
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

const buildXmlSourceUrl = (config: InstrumentConfig) => {
  if (config.xmlSourceUrl) {
    return config.xmlSourceUrl;
  }

  const source = config.sourceUrl;
  const exportPath = config.exportPath ?? source.match(/([a-z]+-\d{4}-\d+)/i)?.[1];
  if (source.startsWith("https://legislation.nsw.gov.au") && exportPath) {
    const dateSegment = config.exportDate ?? "current";
    return `https://legislation.nsw.gov.au/export/xml/${dateSegment}/${exportPath}`;
  }

  return source;
};

export const fetchInstrumentXml = async (
  config: InstrumentConfig,
): Promise<InstrumentFetchResult> => {
  const preferFixtures = process.env.LEGISLATION_USE_FIXTURES === "true";

  if (preferFixtures && config.fixtureFile) {
    return loadFromFixture(config);
  }

  if (config.sourceUrl.startsWith("file://")) {
    const document = await readFileFromUrl(config.sourceUrl);
    return {
      document,
      fetchedAt: new Date(),
      status: 200,
      sourceUrl: config.sourceUrl,
      usedFixture: true,
      format: detectFormat(document),
    };
  }

  try {
    const targetUrl = buildXmlSourceUrl(config);
    const { document, status } = await performHttpFetch(targetUrl);
    return {
      document,
      fetchedAt: new Date(),
      status,
      sourceUrl: targetUrl,
      usedFixture: false,
      format: detectFormat(document),
    };
  } catch (error) {
    if (config.fixtureFile) {
      console.warn(`Falling back to fixture for ${config.slug}: ${String(error)}`);
      return loadFromFixture(config);
    }
    throw error;
  }
};
