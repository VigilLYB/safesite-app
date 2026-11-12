import { z } from "zod";

export const roleSchema = z.enum(["WORKER", "SUPERVISOR", "MANAGER"]);
export type Role = z.infer<typeof roleSchema>;

export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof severitySchema>;

export const incidentStatusSchema = z.enum([
  "OPEN",
  "VALIDATED",
  "APPROVED",
  "REJECTED",
  "ACTION_ASSIGNED",
  "RESOLVED",
  "CLOSED",
]);
export type IncidentStatus = z.infer<typeof incidentStatusSchema>;

export const personRefSchema = z.object({ id: z.string(), fullName: z.string() });
export type PersonRef = z.infer<typeof personRefSchema>;

export const mediaSchema = z.object({ key: z.string(), url: z.string() });

export const pageInfoSchema = z.object({ nextCursor: z.string().nullable() });
