import { z } from "zod";

export const candidateSchema = z.object({
  id: z.string(),
  formattedAddress: z.string(),
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
});

const normaliseCandidateProvider = (candidate: z.infer<typeof candidateSchema>) => {
  if (candidate.provider) return candidate.provider;
  if (candidate.id?.startsWith("place")) return "google" as const;
  return undefined;
};

export const persistableCandidateSchema = candidateSchema.transform((candidate) => ({
  ...candidate,
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
