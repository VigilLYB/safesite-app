import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsKeys, incidentKeys, incidentsApi, uploadFile, type Severity } from "@/lib/api";
import { AUDIO_CONTENT_TYPE, PHOTO_CONTENT_TYPE } from "../lib/report-schema";
import type { ReportDraft } from "./useReportDraft";

export interface ReportSubmission {
  draft: ReportDraft & { severity: Severity };
  photoUri: string | null;
  audioUri: string | null;
}

/**
 * Uploads media, then submits once. Uploaded keys are remembered, so a retry after a failed submit
 * doesn't upload again, and the same clientSubmissionId makes the server replay rather than duplicate.
 */
export function useSubmitReport() {
  const queryClient = useQueryClient();
  const uploaded = useRef(new Map<string, string>());

  const keyFor = async (uri: string, kind: "photo" | "audio", contentType: string) => {
    const known = uploaded.current.get(uri);
    if (known) return known;
    const key = await uploadFile({ uri, kind, contentType });
    uploaded.current.set(uri, key);
    return key;
  };

  return useMutation({
    mutationFn: async ({ draft, photoUri, audioUri }: ReportSubmission) => {
      const [photoKey, audioKey] = await Promise.all([
        photoUri ? keyFor(photoUri, "photo", PHOTO_CONTENT_TYPE) : undefined,
        audioUri ? keyFor(audioUri, "audio", AUDIO_CONTENT_TYPE) : undefined,
      ]);
      return incidentsApi.submit({
        clientSubmissionId: draft.clientSubmissionId,
        severity: draft.severity,
        category: draft.category.trim() || undefined,
        title: draft.title.trim() || undefined,
        description: draft.description.trim() || undefined,
        photoKey,
        audioKey,
        location: draft.pin
          ? { blueprintId: draft.pin.blueprintId, pin: { x: draft.pin.x, y: draft.pin.y } }
          : undefined,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
