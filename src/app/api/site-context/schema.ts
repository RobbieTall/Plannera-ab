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
