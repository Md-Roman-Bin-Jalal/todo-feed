import { z } from "zod";

export const taskPrioritySchema = z.enum(["low", "medium", "high"]);
export const taskStatusSchema = z.enum(["pending", "completed"]);

const optionalTextSchema = z
  .string()
  .trim()
  .max(50, "Description must be 50 characters or less.")
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const dueDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD.")
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }

    return value;
  });

const createDueDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must use YYYY-MM-DD.")
  .optional();

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(13, "Title must be 13 characters or less."),
  description: z
    .string()
    .trim()
    .max(50, "Description must be 50 characters or less.")
    .optional(),
  priority: taskPrioritySchema.optional(),
  due_date: createDueDateSchema,
});

export const updateTaskSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(13, "Title must be 13 characters or less.")
      .optional(),
    description: optionalTextSchema,
    status: taskStatusSchema.optional(),
    priority: taskPrioritySchema.optional().nullable(),
    due_date: dueDateSchema,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one task field is required.",
  });
