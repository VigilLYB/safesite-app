import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { analyticsKeys, incidentKeys, incidentsApi, uploadFile } from "@/lib/api";
import { clock } from "@/lib/clock";
import { isOnline } from "@/lib/offline/network";
import { useSession } from "@/features/auth";
import { dequeueOfflineReport, enqueueOfflineReport } from "../lib/offline-queue";
import {
  submitWithRecovery,
  SavedOnDevice,
  type FileToSend,
  type SubmitDeps,
  type UploadedKey,
} from "../lib/submit";
import { buildSubmitBody, type ReportInput } from "../lib/body";
import { draftStore } from "../lib/draft-store";
import { notifyOfflineQueueChanged } from "../lib/queue-events";

export interface ReportSubmission {
  input: Omit<ReportInput, "photoKey" | "audioKey">;
  photo: FileToSend | null;
  audio: FileToSend | null;
}

/** The report could not be sent, and saving it on the device failed too (e.g. a full disk). */
export class NotSaved extends Error {
  override readonly cause: unknown;
  constructor(cause: unknown) {
    super(
      "Couldn't send the report or save it on this device. Keep this screen open and try again.",
    );
    this.name = "NotSaved";
    this.cause = cause;
  }
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
 *
 * With no connection (known up front, or after the resends run out) the report is saved on the
 * device and the mutation fails with `SavedOnDevice` only once that save has finished. The draft
 * is then reset: the saved copy owns that `clientSubmissionId`, so the form must not resend it.
 */
export function useSubmitReport(deps: SubmitDeps = realDeps) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const cache = useRef(new Map<string, UploadedKey>());
  return useMutation({
    mutationFn: async ({ input, photo, audio }: ReportSubmission) => {
      try {
        // Clearly offline: do not spend the resend backoff on requests that cannot work.
        if (!isOnline()) throw new SavedOnDevice(new Error("Offline"));
        return await submitWithRecovery({
          photo,
          audio,
          cache: cache.current,
          deps,
          build: (keys) => buildSubmitBody({ ...input, ...keys }),
        });
      } catch (error) {
        if (!(error instanceof SavedOnDevice)) throw error;
        if (!user) throw new NotSaved(error);
        try {
          await enqueueOfflineReport({
            id: input.clientSubmissionId,
            userId: user.id,
            input,
            photo,
            audio,
          });
        } catch (saveError) {
          throw new NotSaved(saveError);
        }
        notifyOfflineQueueChanged();
        draftStore.reset();
        throw error;
      }
    },
    onSuccess: (result, { input }) => {
      // A report saved earlier and resent from the form is no longer waiting on the device.
      void dequeueOfflineReport(input.clientSubmissionId)
        .then(notifyOfflineQueueChanged)
        .catch(() => undefined);
      queryClient.setQueryData(incidentKeys.detail(result.incident.id), result.incident);
      void queryClient.invalidateQueries({ queryKey: incidentKeys.lists() });
      const parent = result.ai?.clusteredUnder?.incidentId;
      if (parent) void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(parent) });
      void queryClient.invalidateQueries({ queryKey: analyticsKeys.all });
    },
  });
}
