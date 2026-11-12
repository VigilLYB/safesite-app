import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsKeys, incidentKeys, incidentsApi, uploadFile } from "@/lib/api";
import { dequeueOfflineReport, enqueueOfflineReport } from "../lib/offline-queue";
import {
  submitWithRecovery,
  SavedOnDevice,
  type FileToSend,
  type SubmitDeps,
  type UploadedKey,
} from "../lib/submit";
import { buildSubmitBody, type ReportInput } from "../lib/body";
import { clock } from "@/lib/clock";

export interface ReportSubmission {
  input: Omit<ReportInput, "photoKey" | "audioKey">;
  photo: FileToSend | null;
  audio: FileToSend | null;
}

const realDeps: SubmitDeps = {
  upload: uploadFile,
  submit: incidentsApi.submit,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nowMs: () => clock.nowMs(),
};

/**
 * Uploads media then submits once. Keys are remembered for 9 minutes so a retry doesn't upload
 * again, and the unchanged `clientSubmissionId` makes the server replay rather than duplicate.
 */
export function useSubmitReport(deps: SubmitDeps = realDeps) {
  const queryClient = useQueryClient();
  const cache = useRef(new Map<string, UploadedKey>());
  return useMutation({
    mutationFn: ({ input, photo, audio }: ReportSubmission) =>
      submitWithRecovery({
        photo,
        audio,
        cache: cache.current,
        deps,
        build: (keys) => buildSubmitBody({ ...input, ...keys }),
      }),
    onError: (error, { input, photo, audio }) => {
      // Give up only after the resend backoff is exhausted (SavedOnDevice): persist it so it
      // survives the app closing, to be resent when a connection comes back (offline-sync.ts).
      if (error instanceof SavedOnDevice) {
        void enqueueOfflineReport({ id: input.clientSubmissionId, input, photo, audio });
      }
    },
    onSuccess: (result, { input }) => {
      void dequeueOfflineReport(input.clientSubmissionId);
      queryClient.setQueryData(incidentKeys.detail(result.incident.id), result.incident);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      const parent = result.ai?.clusteredUnder?.incidentId;
      if (parent) void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(parent) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
