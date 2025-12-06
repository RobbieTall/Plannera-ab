import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import pdfParse from "pdf-parse";

import { WorkspaceSourceType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { indexWorkspaceSource, storeExternalFileAsUpload } from "@/lib/source-indexing";
import { normalizeCouncilLgaCode } from "@/lib/council/lga-normaliser";

const DEFAULT_DCP_LINKS: Record<string, { name: string; url: string }> = {
  BYRON: {
    name: "Byron Shire Development Control Plan 2014",
    url: "/dcp/byron-shire-dcp-2014.html",
  },
};

const toAbsoluteUrl = (url: string) => {
  if (url.startsWith("http")) return url;
  const baseUrl =
    process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
};

const extractTextFromPdf = async (filePath: string) => {
  const buffer = await readFile(filePath);
  const parsed = await pdfParse(buffer);
  const text = parsed.text?.trim();
  if (text && text.length > 0) return text;
  return buffer.toString("utf-8");
};

const extractFromHtml = (html: string) => {
  const withoutScripts = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  const withoutStyles = withoutScripts.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  const bodyMatch = withoutStyles.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : withoutStyles;
  const text = bodyContent
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text;
};

export const ingestCouncilDcp = async (lgaCode: string) => {
  const canonicalLgaCode = normalizeCouncilLgaCode(lgaCode);
  if (!canonicalLgaCode) {
    throw new Error(`Invalid LGA code: ${lgaCode}`);
  }

  const link =
    (await prisma.developmentControlPlanLink.findFirst({ where: { lgaCode: canonicalLgaCode } })) ||
    DEFAULT_DCP_LINKS[canonicalLgaCode];
  if (!link) {
    throw new Error(`No DCP link configured for LGA ${canonicalLgaCode}`);
  }

  const url = toAbsoluteUrl(link.url);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DCP for ${canonicalLgaCode} (status ${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  let extractedText: string | null = null;
  const fileName = basename(new URL(url).pathname) || `${canonicalLgaCode}-dcp.pdf`;
  let mimeType = contentType;
  let storagePath = "";
  let publicUrl = "";
  let fileSize: number | undefined;

  if (contentType.includes("pdf")) {
    const arrayBuffer = await response.arrayBuffer();
    const file = new File([arrayBuffer], fileName, { type: contentType || "application/pdf" });
    const saved = await storeExternalFileAsUpload({ file, fileName });
    storagePath = saved.path;
    publicUrl = saved.url;
    mimeType = saved.mimeType;
    fileSize = saved.size;
    extractedText = await extractTextFromPdf(saved.path);
  } else {
    const html = await response.text();
    extractedText = extractFromHtml(html);
    const file = new File([html], `${fileName || canonicalLgaCode}.html`, { type: contentType || "text/html" });
    const saved = await storeExternalFileAsUpload({ file, fileName: `${fileName || canonicalLgaCode}.html` });
    storagePath = saved.path;
    publicUrl = saved.url;
    mimeType = saved.mimeType;
    fileSize = saved.size;
  }

  if (!extractedText) {
    throw new Error(`No text could be extracted for LGA ${canonicalLgaCode}`);
  }

  const councilDocument = await prisma.councilDocument.upsert({
    where: { lgaCode: canonicalLgaCode },
    create: {
      lgaCode: canonicalLgaCode,
      title: link.name,
      sourceUrl: link.url,
      fileName,
      fileExtension: fileName.split(".").pop(),
      mimeType,
      fileSize,
      storagePath,
      publicUrl,
      extractedText,
    },
    update: {
      title: link.name,
      sourceUrl: link.url,
      fileName,
      fileExtension: fileName.split(".").pop(),
      mimeType,
      fileSize,
      storagePath,
      publicUrl,
      extractedText,
      updatedAt: new Date(),
    },
  });

  const existingCouncilDcpChunks = await prisma.workspaceSourceChunk.count({
    where: { councilDocumentId: councilDocument.id },
  });

  await prisma.workspaceSourceChunk.deleteMany({ where: { councilDocumentId: councilDocument.id } });

  const { created } = await indexWorkspaceSource({
    text: extractedText,
    lgaCode: canonicalLgaCode,
    councilDocumentId: councilDocument.id,
    sourceType: WorkspaceSourceType.council_dcp,
    metadata: { heading: link.name, sourceUrl: link.url },
  });

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "[ingest-dcp]",
      `canonicalLga=${canonicalLgaCode} createdCouncilDcpChunks=${created} existingCouncilDcpChunks=${existingCouncilDcpChunks}`,
    );
  }

  return {
    chunksCreated: created,
    councilDocumentId: councilDocument.id,
    title: link.name,
  };
};
