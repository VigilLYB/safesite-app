import { useCallback, useState } from "react";
import type { Severity } from "@/lib/api";
import { newId } from "@/lib/id";
import type { Pin } from "@/features/blueprints";

export type ReportStep = 1 | 2 | 3;

export interface ReportDraft {
  /** Idempotency key: made once per report, reused by every retry of this submission. */
  clientSubmissionId: string;
  step: ReportStep;
  severity: Severity | null;
  title: string;
  description: string;
  category: string;
  pin: Pin | null;
}

const fresh = (): ReportDraft => ({
  clientSubmissionId: newId(),
  step: 1,
  severity: null,
  title: "",
  description: "",
  category: "",
  pin: null,
});

export function useReportDraft() {
  const [draft, setDraft] = useState<ReportDraft>(fresh);
  const patch = useCallback(
    (changes: Partial<ReportDraft>) => setDraft((previous) => ({ ...previous, ...changes })),
    [],
  );
  const reset = useCallback(() => setDraft(fresh()), []);
  return { draft, patch, reset };
}
