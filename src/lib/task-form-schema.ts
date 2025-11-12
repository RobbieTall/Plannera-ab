import { z } from "zod";

import type { TaskPriority, TaskStatus } from "./mock-data";

const priorityValues = ["high", "medium", "low"] as const satisfies readonly TaskPriority[];
const statusValues = ["todo", "in-progress", "completed", "blocked"] as const satisfies readonly TaskStatus[];

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  tags: string[];
  estimatedHours: number | null;
}

export const taskFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(120, "Title must be 120 characters or less"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(3000, "Description must be 3000 characters or less"),
    priority: z.enum(priorityValues),
    status: z.enum(statusValues),
    dueDate: z
      .string()
      .nullable()
      .refine(
        (value) => !value || !Number.isNaN(new Date(value).getTime()),
        "Enter a valid due date",
      ),
    projectId: z.string().min(1, "Select a project"),
    assigneeId: z.string().nullable(),
    tags: z
      .array(
        z
          .string()
          .min(1, "Tags cannot be empty")
          .max(24, "Tags must be 24 characters or less"),
      )
      .max(8, "You can add up to 8 tags"),
    estimatedHours: z
      .number()
      .min(0, "Estimated time must be zero or greater")
      .max(1000, "Estimated time seems too large")
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.dueDate) {
      const due = new Date(data.dueDate);
      due.setHours(0, 0, 0, 0);
      const min = new Date("1900-01-01");
      if (due < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due date must be after 1900",
          path: ["dueDate"],
        });
      }
    }
  });

export const defaultTaskFormValues: TaskFormValues = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: null,
  projectId: "",
  assigneeId: null,
  tags: [],
  estimatedHours: null,
};

