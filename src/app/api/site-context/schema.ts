import { randomUUID } from "crypto";

import { z } from "zod";

type CandidateInput = {
  id?: string;
  placeId?: string;
  provider?: "google" | "nsw-point";
};

const normaliseCandidateProvider = (candidate: CandidateInput) => {
  if (candidate.provider) return candidate.provider;
  if (candidate.placeId) return "google" as const;
  if (candidate.id?.startsWith("place")) return "google" as const;
  return undefined;
};

export const candidateSchema = z
  .object({
    id: z.string().optional(),
    placeId: z.string().optional(),
    formattedAddress: z.string().optional(),
    address: z.string().optional(),
    lgaName: z.string().nullable().optional().default(null),
    lgaCode: z.string().nullable().optional(),
    parcelId: z.string().nullable().optional(),
    lot: z.string().nullable().optional(),
    planNumber: z.string().nullable().optional(),
    latitude: z.coerce.number().nullable().optional(),
    longitude: z.coerce.number().nullable().optional(),
    zone: z.string().nullable().optional(),
    confidence: z.number().optional(),
    provider: z.enum(["google", "nsw-point"]).optional(),
  })
  .superRefine((candidate, ctx) => {
    const provider = normaliseCandidateProvider(candidate);
    const addressText = candidate.formattedAddress ?? candidate.address;
    const hasId = Boolean(candidate.id ?? candidate.placeId);

    if (!addressText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Formatted address is required",
        path: ["formattedAddress"],
      });
    }

    if (!hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A place or site identifier is required",
        path: ["id"],
      });
    }

    if (provider === "google") {
      const isMissingLatitude = candidate.latitude === null || candidate.latitude === undefined;
      const isMissingLongitude = candidate.longitude === null || candidate.longitude === undefined;

      if (isMissingLatitude || isMissingLongitude) {
        console.warn("[site-context-update] Google candidate missing coords", {
          provider: candidate.provider,
          address: addressText,
          placeId: candidate.placeId,
        });
      }
    }
  });

export const persistableCandidateSchema = candidateSchema.transform((candidate) => ({
  ...candidate,
  id: candidate.id ?? candidate.placeId ?? `place-${randomUUID()}`,
  formattedAddress: candidate.formattedAddress ?? candidate.address ?? "",
  provider: normaliseCandidateProvider(candidate),
  lgaName: candidate.lgaName ?? null,
  lgaCode: candidate.lgaCode ?? null,
  parcelId: candidate.parcelId ?? null,
  lot: candidate.lot ?? null,
  planNumber: candidate.planNumber ?? null,
  latitude: candidate.latitude ?? null,
  longitude: candidate.longitude ?? null,
  zone: candidate.zone ?? null,
}));
