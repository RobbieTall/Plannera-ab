"use server";

import { revalidatePath } from "next/cache";

import { z } from "zod";

import { prisma } from "@/lib/prisma";

const accessToken = process.env.ADMIN_ACCESS_TOKEN;

export type ActionState = {
  error: string | null;
  message: string | null;
};

const initialState: ActionState = { error: null, message: null };

const linkSchema = z.object({
  lgaCode: z
    .string()
    .trim()
    .min(1, "LGA code is required")
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, "Name is required"),
  url: z
    .string()
    .trim()
    .url("Enter a valid URL")
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
});

const idSchema = z.object({
  id: z.string().trim().min(1, "Missing link id"),
});

const unauthorizedState: ActionState = {
  error: "Not authorized to manage DCP links.",
  message: null,
};

const ensureValidToken = (token: FormDataEntryValue | null): ActionState | null => {
  if (!accessToken) {
    return {
      error: "Admin access token is not configured.",
      message: null,
    };
  }

  if (typeof token !== "string" || token !== accessToken) {
    return unauthorizedState;
  }

  return null;
};

export const createDevelopmentControlPlanLink = async (
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const tokenError = ensureValidToken(formData.get("token"));
  if (tokenError) return tokenError;

  const parseResult = linkSchema.safeParse({
    lgaCode: formData.get("lgaCode"),
    name: formData.get("name"),
    url: formData.get("url"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input", message: null };
  }

  const { lgaCode, name, url } = parseResult.data;

  try {
    await prisma.developmentControlPlanLink.create({
      data: { lgaCode, name, url },
    });
    revalidatePath("/admin/dcp-links");
    return { error: null, message: "Link created" };
  } catch (error) {
    console.error("[dcp-links] Failed to create link", { error });
    return { error: "Failed to create link. Ensure the LGA code is unique.", message: null };
  }
};

export const updateDevelopmentControlPlanLink = async (
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const tokenError = ensureValidToken(formData.get("token"));
  if (tokenError) return tokenError;

  const parseResult = linkSchema.merge(idSchema).safeParse({
    id: formData.get("id"),
    lgaCode: formData.get("lgaCode"),
    name: formData.get("name"),
    url: formData.get("url"),
  });

  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid input", message: null };
  }

  const { id, lgaCode, name, url } = parseResult.data;

  try {
    await prisma.developmentControlPlanLink.update({
      where: { id },
      data: { lgaCode, name, url },
    });
    revalidatePath("/admin/dcp-links");
    return { error: null, message: "Link updated" };
  } catch (error) {
    console.error("[dcp-links] Failed to update link", { id, error });
    return { error: "Failed to update link. Ensure the LGA code is unique.", message: null };
  }
};

export const deleteDevelopmentControlPlanLink = async (
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> => {
  const tokenError = ensureValidToken(formData.get("token"));
  if (tokenError) return tokenError;

  const parseResult = idSchema.safeParse({ id: formData.get("id") });
  if (!parseResult.success) {
    return { error: parseResult.error.issues[0]?.message ?? "Invalid request", message: null };
  }

  const { id } = parseResult.data;

  try {
    await prisma.developmentControlPlanLink.delete({ where: { id } });
    revalidatePath("/admin/dcp-links");
    return { error: null, message: "Link deleted" };
  } catch (error) {
    console.error("[dcp-links] Failed to delete link", { id, error });
    return { error: "Failed to delete link.", message: null };
  }
};

export { initialState };
