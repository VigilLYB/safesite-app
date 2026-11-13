import { z } from "zod";
import { personRefSchema, severitySchema, incidentStatusSchema } from "./common";

export const actionTypeSchema = z.enum(["ONE_OFF", "PREBUILT", "CUSTOM"]);
export type ActionType = z.infer<typeof actionTypeSchema>;
export const actionStatusSchema = z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]);
export type ActionStatus = z.infer<typeof actionStatusSchema>;

export const milestoneSchema = z.object({
  id: z.string(),
  seq: z.number().int(),
  title: z.string(),
  dueAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  completedBy: personRefSchema.nullish(),
  isOverdue: z.boolean(),
});

export const actionSchema = z.object({
  id: z.string(),
  incident: z.object({
    id: z.string(),
    title: z.string().nullable(),
    severity: severitySchema,
    status: incidentStatusSchema,
    areaName: z.string().nullable(),
  }),
  type: actionTypeSchema,
  templateCode: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: actionStatusSchema,
  assignee: personRefSchema.nullable(),
  assignedBy: personRefSchema,
  dueAt: z.string().nullable(),
  isOverdue: z.boolean(),
  completedAt: z.string().nullable(),
  progress: z.object({ done: z.number().int(), total: z.number().int() }),
  milestones: z.array(milestoneSchema).optional(),
  /** When the current assignee was set (creation or latest reassignment). */
  assignedAt: z.string().optional(),
  createdAt: z.string(),
});
export type Action = z.infer<typeof actionSchema>;
export const actionListSchema = z.object({ items: z.array(actionSchema) });

export const actionTemplateSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  milestones: z.array(z.object({ title: z.string(), offsetDays: z.number() })),
});
export type ActionTemplate = z.infer<typeof actionTemplateSchema>;
export const actionTemplateListSchema = z.object({ items: z.array(actionTemplateSchema) });
