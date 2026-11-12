export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface Endpoint {
  readonly method: HttpMethod;
  /** OpenAPI path template, e.g. /v1/incidents/{id}. */
  readonly template: string;
  /** Slow calls (inline transcription, Rekognition) get a longer client timeout. */
  readonly timeoutMs?: number;
}

const e = (method: HttpMethod, template: string, timeoutMs?: number): Endpoint =>
  timeoutMs === undefined ? { method, template } : { method, template, timeoutMs };

/** Every endpoint the app calls. Tests check each one against docs/openapi.snapshot.json. */
export const endpoints = {
  health: e("GET", "/health"),
  login: e("POST", "/v1/auth/login"),
  me: e("GET", "/v1/auth/me"),
  users: e("GET", "/v1/users"),
  userCreate: e("POST", "/v1/users"),
  presignUpload: e("POST", "/v1/uploads"),
  blueprints: e("GET", "/v1/blueprints"),
  blueprint: e("GET", "/v1/blueprints/{id}"),
  blueprintCreate: e("POST", "/v1/blueprints"),
  areaCreate: e("POST", "/v1/blueprints/{id}/areas"),
  incidentSubmit: e("POST", "/v1/incidents", 35_000),
  incidents: e("GET", "/v1/incidents"),
  incident: e("GET", "/v1/incidents/{id}"),
  incidentEdit: e("PATCH", "/v1/incidents/{id}"),
  incidentMove: e("PUT", "/v1/incidents/{id}/location"),
  incidentTimeline: e("GET", "/v1/incidents/{id}/versions"),
  incidentVersion: e("GET", "/v1/incidents/{id}/versions/{version}"),
  incidentRetryTranscription: e("POST", "/v1/incidents/{id}/transcription", 35_000),
  incidentTransition: e("POST", "/v1/incidents/{id}/transitions"),
  incidentCluster: e("PUT", "/v1/incidents/{id}/cluster"),
  incidentUncluster: e("DELETE", "/v1/incidents/{id}/cluster"),
  incidentSimilar: e("GET", "/v1/incidents/{id}/similar"),
  incidentDuplicates: e("GET", "/v1/incidents/{id}/duplicates"),
  incidentAuditExport: e("GET", "/v1/incidents/{id}/audit-export"),
  actionTemplates: e("GET", "/v1/action-templates"),
  actionAssign: e("POST", "/v1/incidents/{id}/actions"),
  actions: e("GET", "/v1/actions"),
  action: e("GET", "/v1/actions/{id}"),
  milestoneComplete: e("POST", "/v1/actions/{id}/milestones/{milestoneId}/complete"),
  actionComplete: e("POST", "/v1/actions/{id}/complete"),
  ppeScanRun: e("POST", "/v1/incidents/{id}/ppe-scans", 30_000),
  ppeScans: e("GET", "/v1/incidents/{id}/ppe-scans"),
  heatmap: e("GET", "/v1/analytics/heatmap"),
  summary: e("GET", "/v1/analytics/summary"),
  trends: e("GET", "/v1/analytics/trends"),
} as const satisfies Record<string, Endpoint>;

export type PathParams = Record<string, string | number>;

/** Fill a template with encoded params. Throws if a param is missing. */
export function buildPath(endpoint: Endpoint, params: PathParams = {}): string {
  return endpoint.template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined)
      throw new Error(`Missing path param "${name}" for ${endpoint.template}`);
    return encodeURIComponent(String(value));
  });
}
