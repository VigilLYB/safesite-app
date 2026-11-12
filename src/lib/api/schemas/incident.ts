import { z } from "zod";
import {
  incidentStatusSchema,
  mediaSchema,
  pageInfoSchema,
  personRefSchema,
  severitySchema,
} from "./common";

export const locationSchema = z.object({
  blueprintId: z.string().nullable(),
  x: z.number().nullable(),
  y: z.number().nullable(),
  source: z.enum(["GPS_ESTIMATE", "MANUAL", "NONE"]),
  areaId: z.string().nullable(),
  areaName: z.string().nullable(),
  gps: z.object({ lat: z.number(), lng: z.number(), accuracyM: z.number().nullable() }).nullish(),
});

const clusterSchema = z.object({
  parentIncidentId: z.string().nullable(),
  similarity: z.number().nullable(),
  isDuplicate: z.boolean(),
});

export const incidentSchema = z.object({
  id: z.string(),
  version: z.number().int(),
  versionId: z.string(),
  reporter: personRefSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  status: incidentStatusSchema,
  title: z.string().nullable(),
  description: z.string().nullable(),
  transcript: z.string().nullable(),
  transcriptLanguage: z.string().nullable(),
  category: z.string().nullable(),
  severity: severitySchema,
  location: locationSchema,
  photo: mediaSchema.nullable(),
  audio: mediaSchema.nullable(),
  customFields: z.record(z.string(), z.unknown()),
  cluster: clusterSchema,
  duplicateCount: z.number().int(),
  processing: z.object({
    transcription: z.enum(["NOT_REQUIRED", "PENDING", "COMPLETED", "FAILED"]),
    error: z.string().nullable(),
  }),
  lastChange: z.object({
    nodeType: z.string(),
    label: z.string(),
    actorRole: z.string(),
    at: z.string(),
  }),
  permissions: z.object({
    transitions: z.array(z.string()),
    canEdit: z.boolean(),
    canCluster: z.boolean(),
    canAssignAction: z.boolean(),
    canRunPpeScan: z.boolean(),
  }),
});
export type Incident = z.infer<typeof incidentSchema>;

export const incidentSummarySchema = z.object({
  id: z.string(),
  version: z.number().int(),
  title: z.string().nullable(),
  category: z.string().nullable(),
  severity: severitySchema,
  status: incidentStatusSchema,
  areaName: z.string().nullable(),
  reporter: personRefSchema,
  clusterParentId: z.string().nullable(),
  duplicateCount: z.number().int(),
  createdAt: z.string(),
});
export type IncidentSummary = z.infer<typeof incidentSummarySchema>;

export const incidentListSchema = z.object({
  items: z.array(incidentSummarySchema),
  pageInfo: pageInfoSchema,
});
export type IncidentList = z.infer<typeof incidentListSchema>;

export const submitIncidentResponseSchema = z.object({
  incident: incidentSchema,
  replayed: z.boolean(),
  ai: z
    .object({
      isMock: z.boolean(),
      transcription: z.object({ status: z.string(), error: z.string().nullable() }).nullish(),
      embedded: z.boolean().nullish(),
      clusteredUnder: z.object({ incidentId: z.string(), similarity: z.number() }).nullish(),
    })
    .nullable(),
});
export type SubmitIncidentResponse = z.infer<typeof submitIncidentResponseSchema>;

export const timelineNodeSchema = z.object({
  version: z.number().int(),
  versionId: z.string(),
  parentVersionId: z.string().nullable(),
  nodeType: z.string(),
  label: z.string(),
  actor: z.object({ id: z.string().nullable(), role: z.string(), fullName: z.string() }),
  note: z.string().nullable(),
  status: incidentStatusSchema,
  changedFields: z.array(z.string()),
  createdAt: z.string(),
});
export type TimelineNode = z.infer<typeof timelineNodeSchema>;

export const incidentTimelineSchema = z.object({
  incidentId: z.string(),
  nodes: z.array(timelineNodeSchema),
});

export const incidentVersionSnapshotSchema = z.object({
  version: z.number().int(),
  versionId: z.string(),
  parentVersionId: z.string().nullable(),
  nodeType: z.string(),
  label: z.string(),
  actor: z.object({ id: z.string().nullable(), role: z.string(), fullName: z.string() }),
  note: z.string().nullable(),
  createdAt: z.string(),
  snapshot: z.object({
    status: incidentStatusSchema,
    title: z.string().nullable(),
    description: z.string().nullable(),
    transcript: z.string().nullable(),
    category: z.string().nullable(),
    severity: severitySchema,
    location: locationSchema,
  }),
});
export type IncidentVersionSnapshot = z.infer<typeof incidentVersionSnapshotSchema>;

export const similarIncidentsSchema = z.object({
  items: z.array(incidentSummarySchema.extend({ similarity: z.number() })),
  reason: z.string().nullish(),
});

export const incidentDuplicatesSchema = z.object({
  parentIncidentId: z.string(),
  items: z.array(incidentSummarySchema),
});

export const ppeScanSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  versionId: z.string(),
  photoKey: z.string(),
  provider: z.string(),
  isMock: z.boolean(),
  summary: z.object({
    verdict: z.enum(["COMPLIANT", "VIOLATION", "NO_PERSONS"]),
    personsDetected: z.number().int(),
    personsWithViolations: z.number().int(),
    persons: z.array(
      z.object({
        personId: z.number(),
        confidence: z.number(),
        detectedEquipment: z.array(z.string()),
        missingEquipment: z.array(z.string()),
      }),
    ),
  }),
  createdBy: z.string(),
  createdAt: z.string(),
});
export type PpeScan = z.infer<typeof ppeScanSchema>;
export const ppeScanListSchema = z.object({ items: z.array(ppeScanSchema) });

export const transitionEventSchema = z.enum(["validate", "approve", "reject", "reopen", "close"]);
export type TransitionEvent = z.infer<typeof transitionEventSchema>;
