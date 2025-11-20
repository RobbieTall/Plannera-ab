export type UploadCategory = "pdf" | "document" | "spreadsheet" | "text" | "image" | "zip";

export const ALLOWED_UPLOAD_TYPES: Array<{
  extensions: string[];
  mimeTypes: string[];
  category: UploadCategory;
}> = [
  { extensions: ["pdf"], mimeTypes: ["application/pdf"], category: "pdf" },
  {
    extensions: ["doc", "docx"],
    mimeTypes: [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    category: "document",
  },
  {
    extensions: ["xls", "xlsx"],
    mimeTypes: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    category: "spreadsheet",
  },
  { extensions: ["csv"], mimeTypes: ["text/csv"], category: "spreadsheet" },
  { extensions: ["txt"], mimeTypes: ["text/plain"], category: "text" },
  { extensions: ["md"], mimeTypes: ["text/markdown", "text/x-markdown"], category: "text" },
  { extensions: ["png"], mimeTypes: ["image/png"], category: "image" },
  { extensions: ["jpg", "jpeg"], mimeTypes: ["image/jpeg"], category: "image" },
  { extensions: ["zip"], mimeTypes: ["application/zip"], category: "zip" },
];

export const ACCEPTED_EXTENSIONS = Array.from(
  new Set(ALLOWED_UPLOAD_TYPES.flatMap((entry) => entry.extensions.map((ext) => `.${ext}`))),
);

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const getAllowedDescriptor = (extension?: string) => {
  if (!extension) return undefined;
  const normalized = extension.toLowerCase();
  return ALLOWED_UPLOAD_TYPES.find((entry) => entry.extensions.includes(normalized));
};
