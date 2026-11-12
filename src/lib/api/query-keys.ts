import type { Query } from "./client";

/** Hierarchical key factories. Defaults never go in a key prefix: invalidation matches by prefix. */
export const sessionKeys = { me: ["session", "me"] as const };
export const healthKeys = { all: ["health"] as const };

export const userKeys = {
  all: ["users"] as const,
  list: (role?: string) => [...userKeys.all, "list", { role }] as const,
};

export const blueprintKeys = {
  all: ["blueprints"] as const,
  list: () => [...blueprintKeys.all, "list"] as const,
  detail: (id: string) => [...blueprintKeys.all, "detail", id] as const,
};

export const incidentKeys = {
  all: ["incidents"] as const,
  lists: () => [...incidentKeys.all, "list"] as const,
  list: (filters: Query) => [...incidentKeys.lists(), filters] as const,
  detail: (id: string) => [...incidentKeys.all, "detail", id] as const,
  /** Sub-resources sit under the detail key, so invalidating the detail refreshes the open tab. */
  timeline: (id: string) => [...incidentKeys.detail(id), "versions"] as const,
  version: (id: string, version: number) => [...incidentKeys.timeline(id), version] as const,
  similar: (id: string, limit = 5) => [...incidentKeys.detail(id), "similar", limit] as const,
  duplicates: (id: string) => [...incidentKeys.detail(id), "duplicates"] as const,
  ppe: (id: string) => [...incidentKeys.detail(id), "ppe-scans"] as const,
};

export const actionKeys = {
  all: ["actions"] as const,
  templates: () => [...actionKeys.all, "templates"] as const,
  lists: () => [...actionKeys.all, "list"] as const,
  list: (filters: Query) => [...actionKeys.lists(), filters] as const,
  detail: (id: string) => [...actionKeys.all, "detail", id] as const,
};

export const analyticsKeys = {
  all: ["analytics"] as const,
  summary: (filters: Query) => [...analyticsKeys.all, "summary", filters] as const,
  heatmap: (filters: Query) => [...analyticsKeys.all, "heatmap", filters] as const,
  trends: (filters: Query) => [...analyticsKeys.all, "trends", filters] as const,
};

/** Drop undefined/null/empty values so equivalent filters share one cache key. */
export function compact<T extends Query>(filters: T): Query {
  const out: Query = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}
