import { useSyncExternalStore } from "react";
import type { CustomFields, Severity } from "@/lib/api";
import { newId } from "@/lib/id";
import { registerSignOutCleanup } from "@/lib/session-hooks";

export interface ReportDraft {
  /** Idempotency key: made once per draft, reused by every retry, replaced only after a successful submit. */
  clientSubmissionId: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  pin: { blueprintId: string; x: number; y: number } | null;
  custom: CustomFields;
}

const fresh = (): ReportDraft => ({
  clientSubmissionId: newId(),
  severity: "MEDIUM", // default Medium, always sent
  category: "",
  title: "",
  description: "",
  pin: null,
  custom: {},
});

let draft: ReportDraft = fresh();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export const draftStore = {
  get: () => draft,
  patch(changes: Partial<ReportDraft>) {
    draft = { ...draft, ...changes };
    emit();
  },
  /** After a successful submit or "Discard draft": a new key, so the next report is a new report. */
  reset() {
    draft = fresh();
    emit();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// Plant devices are shared: signing out drops the previous person's unsent draft (guide §2.1).
registerSignOutCleanup(() => draftStore.reset());

export function useReportDraft() {
  const value = useSyncExternalStore(draftStore.subscribe, draftStore.get, draftStore.get);
  return { draft: value, patch: draftStore.patch, reset: draftStore.reset };
}
