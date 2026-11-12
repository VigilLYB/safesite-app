import type { Incident } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { BottomSheet, Button, Stack, Text } from "@/components/ui";
import type { StaleChange } from "../hooks/useIncidentChanges";

export interface StaleVersionDialogProps {
  stale: StaleChange | null;
  /** The refetched report. */
  fresh: Incident | undefined;
  busy: boolean;
  onReview: () => void;
  onRetry: () => void;
  onDiscard: () => void;
}

/** Guide §2.4: say what changed, then let the person choose. Never overwrite silently. */
export function StaleVersionDialog({
  stale,
  fresh,
  busy,
  onReview,
  onRetry,
  onDiscard,
}: StaleVersionDialogProps) {
  if (!stale) return null;
  const canRetry = Boolean(fresh && stale.allowed(fresh));
  return (
    <BottomSheet visible title="This report changed" onClose={onDiscard}>
      <Stack gap={4}>
        <Text testID="stale-message">
          {fresh
            ? `This report changed since you opened it (v${stale.expected} → v${fresh.version}): ${fresh.lastChange.label}, ${formatTime(fresh.lastChange.at)}.`
            : "This report changed since you opened it. Loading the latest version…"}
        </Text>
        <Button label="Review changes" variant="secondary" fullWidth onPress={onReview} />
        {canRetry ? (
          <Button
            label="Apply my change again"
            fullWidth
            loading={busy}
            onPress={onRetry}
            testID="stale-retry"
          />
        ) : (
          <Text variant="caption" tone="muted">
            Your change is no longer allowed on the latest version.
          </Text>
        )}
        <Button
          label="Discard"
          variant="tertiary"
          size="desk"
          fullWidth
          onPress={onDiscard}
          testID="stale-discard"
        />
      </Stack>
    </BottomSheet>
  );
}
