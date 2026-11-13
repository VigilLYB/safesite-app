import type { CustomFields } from "@/lib/api";
import { LIMITS } from "@/lib/validation";

/**
 * The frontend's custom-field config (guide §4.2): the backend has no schema endpoint yet, so
 * these are constants. Unknown keys already on a report are shown raw and kept on save.
 */
export const KNOWN_FIELDS = [
  { key: "equipmentTag", label: "Equipment tag", type: "text" },
  { key: "workOrder", label: "Work order", type: "text" },
  { key: "injuryOccurred", label: "Injury occurred", type: "boolean" },
  { key: "productionStopped", label: "Production stopped", type: "boolean" },
] as const;

export type FieldValue = string | number | boolean | null;

export function labelFor(key: string): string {
  return KNOWN_FIELDS.find((field) => field.key === key)?.label ?? key;
}

/** Narrow the API's `unknown` values to what the server accepts. */
export function toCustomFields(raw: Record<string, unknown> | null | undefined): CustomFields {
  const out: CustomFields = {};
  for (const [key, value] of Object.entries(raw ?? {})) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * PATCH replaces `customFields` wholesale, so merge the edits into the current object and keep
 * every key the form doesn't know. Cleared text fields are dropped.
 */
export function mergeCustomFields(current: CustomFields, edits: CustomFields): CustomFields {
  const merged: CustomFields = { ...current };
  for (const [key, value] of Object.entries(edits)) {
    if (value === "" || value === null || value === undefined) delete merged[key];
    else
      merged[key] =
        typeof value === "string" ? value.trim().slice(0, LIMITS.customFieldValue) : value;
  }
  return merged;
}

/** A create body omits empty values; returns undefined when nothing is filled in. */
export function compactCustomFields(fields: CustomFields): CustomFields | undefined {
  const out: CustomFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === "" || value === null) continue;
    out[key] = typeof value === "string" ? value.trim() : value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function sameCustomFields(a: CustomFields, b: CustomFields): boolean {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  return ak.length === bk.length && ak.every((key, i) => key === bk[i] && a[key] === b[key]);
}
