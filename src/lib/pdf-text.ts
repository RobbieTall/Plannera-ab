export async function extractPdfText(file: File): Promise<string | null> {
  // TODO: replace with a proper PDF text extraction pipeline.
  try {
    const text = await file.text();
    const normalized = text.trim();
    if (!normalized) {
      return null;
    }
    return normalized.slice(0, 8000);
  } catch (error) {
    console.warn("[pdf-extraction-warning]", error);
    return null;
  }
}
