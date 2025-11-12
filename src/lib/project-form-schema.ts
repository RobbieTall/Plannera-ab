import { z } from "zod";

import type { ProjectPriority, ProjectStatus } from "./mock-data";

const statusValues = ["active", "on-hold", "completed", "archived"] as const satisfies readonly ProjectStatus[];
const priorityValues = ["high", "medium", "low"] as const satisfies readonly ProjectPriority[];

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  teamMemberIds: string[];
  tags: string[];
  color: string;
}

export const projectFormSchema = z
  .object({
    name: z
      .string()
      .min(1, "Project name is required")
      .max(120, "Project name must be 120 characters or less"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(4000, "Description must be 4000 characters or less"),
    status: z.enum(statusValues),
    priority: z.enum(priorityValues),
    startDate: z
      .string()
      .nullable()
      .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Enter a valid start date"),
    endDate: z
      .string()
      .nullable()
      .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), "Enter a valid end date"),
    progress: z
      .number()
      .min(0, "Progress must be at least 0")
      .max(100, "Progress cannot exceed 100"),
    teamMemberIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one team member")
      .max(12, "Keep team selection to 12 people or fewer"),
    tags: z
      .array(
        z
          .string()
          .min(1, "Tags cannot be empty")
          .max(32, "Tags must be 32 characters or less"),
      )
      .max(10, "You can add up to 10 tags"),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Choose a valid hex color"),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date must be after the start date",
        });
      }
    }
  });

export const defaultProjectFormData: ProjectFormData = {
  name: "",
  description: "",
  status: "active",
  priority: "medium",
  startDate: null,
  endDate: null,
  progress: 50,
  teamMemberIds: [],
  tags: [],
  color: "#2563eb",
};
