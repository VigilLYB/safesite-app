import { request, requestText, type Query } from "../client";
import { endpoints } from "../registry";
import {
  incidentDuplicatesSchema,
  incidentListSchema,
  incidentSchema,
  incidentTimelineSchema,
  incidentVersionSnapshotSchema,
  ppeScanListSchema,
  ppeScanSchema,
  similarIncidentsSchema,
  submitIncidentResponseSchema,
  type Severity,
  type TransitionEvent,
} from "../schemas";

export interface IncidentFilters extends Query {
  status?: string | undefined;
  severity?: Severity | undefined;
  mine?: boolean | undefined;
  reporterId?: string | undefined;
  blueprintId?: string | undefined;
  areaId?: string | undefined;
  rootsOnly?: boolean | undefined;
  from?: string | undefined;
  to?: string | undefined;
  limit?: number | undefined;
}

export interface SubmitIncidentInput {
  /** Idempotency key: created once per user action so a retry replays instead of duplicating. */
  clientSubmissionId: string;
  severity?: Severity | undefined;
  category?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;
  photoKey?: string | undefined;
  audioKey?: string | undefined;
  location?:
    | {
        blueprintId?: string | undefined;
        pin?: { x: number; y: number } | undefined;
        gps?: { lat: number; lng: number; accuracyM?: number | undefined } | undefined;
      }
    | undefined;
  customFields?: CustomFields | undefined;
  /** When the hazard was seen (device clock, ISO). Matters for reports saved offline. */
  capturedAt?: string | undefined;
}

export type CustomFields = Record<string, string | number | boolean | null>;

export interface EditIncidentInput {
  expectedVersion: number;
  title?: string | null | undefined;
  description?: string | null | undefined;
  category?: string | null | undefined;
  severity?: Severity | undefined;
  photoKey?: string | null | undefined;
  /** The server replaces the whole object: always send the complete, merged value. */
  customFields?: CustomFields | undefined;
  note?: string | undefined;
}

export const incidentsApi = {
  submit: (body: SubmitIncidentInput) =>
    request({ endpoint: endpoints.incidentSubmit, body, schema: submitIncidentResponseSchema }),
  list: (filters: IncidentFilters & { cursor?: string | undefined }, signal?: AbortSignal) =>
    request({ endpoint: endpoints.incidents, query: filters, schema: incidentListSchema, signal }),
  get: (id: string, signal?: AbortSignal) =>
    request({ endpoint: endpoints.incident, params: { id }, schema: incidentSchema, signal }),
  edit: (id: string, body: EditIncidentInput) =>
    request({ endpoint: endpoints.incidentEdit, params: { id }, body, schema: incidentSchema }),
  move: (
    id: string,
    body: { expectedVersion: number; blueprintId: string; x: number; y: number },
  ) => request({ endpoint: endpoints.incidentMove, params: { id }, body, schema: incidentSchema }),
  timeline: (id: string, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.incidentTimeline,
      params: { id },
      schema: incidentTimelineSchema,
      signal,
    }),
  version: (id: string, version: number, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.incidentVersion,
      params: { id, version },
      schema: incidentVersionSnapshotSchema,
      signal,
    }),
  retryTranscription: (id: string) =>
    request({
      endpoint: endpoints.incidentRetryTranscription,
      params: { id },
      schema: incidentSchema,
    }),
  transition: (
    id: string,
    body: { event: TransitionEvent; expectedVersion: number; note?: string | undefined },
  ) =>
    request({
      endpoint: endpoints.incidentTransition,
      params: { id },
      body,
      schema: incidentSchema,
    }),
  cluster: (
    id: string,
    body: { parentIncidentId: string; expectedVersion: number; note?: string | undefined },
  ) =>
    request({ endpoint: endpoints.incidentCluster, params: { id }, body, schema: incidentSchema }),
  uncluster: (id: string, body: { expectedVersion: number; note?: string | undefined }) =>
    request({
      endpoint: endpoints.incidentUncluster,
      params: { id },
      body,
      schema: incidentSchema,
    }),
  similar: (id: string, limit = 5, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.incidentSimilar,
      params: { id },
      query: { limit },
      schema: similarIncidentsSchema,
      signal,
    }),
  duplicates: (id: string, signal?: AbortSignal) =>
    request({
      endpoint: endpoints.incidentDuplicates,
      params: { id },
      schema: incidentDuplicatesSchema,
      signal,
    }),
  runPpeScan: (id: string) =>
    request({ endpoint: endpoints.ppeScanRun, params: { id }, schema: ppeScanSchema }),
  ppeScans: async (id: string, signal?: AbortSignal) =>
    (
      await request({
        endpoint: endpoints.ppeScans,
        params: { id },
        schema: ppeScanListSchema,
        signal,
      })
    ).items,
  /** Full version history as CSV, with the tamper-evidence chain checked (manager only). */
  auditExportCsv: (id: string, signal?: AbortSignal) =>
    requestText({ endpoint: endpoints.incidentAuditExport, params: { id }, signal }),
};
