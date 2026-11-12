import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { incidentsApi, isApiError, type Incident } from "@/lib/api";
import { displayTitle, shortId } from "@/lib/format";
import { BottomSheet, Button, Card, Stack, Text, TextField } from "@/components/ui";
import { InlineNotice, MutationError } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import type { Outcome } from "../hooks/useIncidentChanges";

export interface LinkDuplicateDialogProps {
  incident: Incident;
  visible: boolean;
  /** Preselected parent (from the Similar tab). */
  initialParentId?: string | null | undefined;
  error: unknown;
  pending: boolean;
  onLink: (parentId: string, note?: string) => Promise<Outcome>;
  onClose: () => void;
}

export function LinkDuplicateDialog({ visible, ...rest }: LinkDuplicateDialogProps) {
  if (!visible) return null;
  return <LinkForm {...rest} />;
}

/** Choose a parent among open, unlinked reports (the IncidentPicker: rootsOnly=true, 25 per page). */
function LinkForm({
  incident,
  initialParentId,
  error,
  pending,
  onLink,
  onClose,
}: Omit<LinkDuplicateDialogProps, "visible">) {
  const [parentId, setParentId] = useState<string | null>(initialParentId ?? null);
  const [note, setNote] = useState("");
  const [suggested, setSuggested] = useState<string | null>(null);
  const picker = useQuery({
    queryKey: ["incidents", "picker", incident.id],
    queryFn: ({ signal }) => incidentsApi.list({ rootsOnly: true, limit: 25 }, signal),
  });

  const candidates = (picker.data?.items ?? []).filter((item) => item.id !== incident.id);
  const suggestedParent =
    isApiError(error) && error.status === 422
      ? ((error.details as { suggestedParentId?: string } | undefined)?.suggestedParentId ?? null)
      : null;

  const submit = async (id: string) => {
    const outcome = await onLink(id, note.trim() || undefined);
    if (outcome !== "error") onClose();
  };

  return (
    <BottomSheet
      visible
      title={incident.cluster.isDuplicate ? "Change parent report" : "Link as duplicate"}
      onClose={onClose}
    >
      <Stack gap={4}>
        <Text tone="muted">Choose the report this one duplicates.</Text>
        {picker.isPending ? <Text variant="caption">Loading reports…</Text> : null}
        {picker.isError ? <InlineNotice message="Couldn't load reports. Try again." /> : null}
        {candidates.map((item) => (
          <Card
            key={item.id}
            onPress={() => setParentId(item.id)}
            selected={parentId === item.id}
            accessibilityLabel={`Choose ${displayTitle(item)}`}
            testID={`pick-${item.id}`}
          >
            <Text variant="mono" tone="muted">
              {shortId(item.id)}
            </Text>
            <Text variant="label">{displayTitle(item)}</Text>
            <SeverityBadge severity={item.severity} showPips={false} />
          </Card>
        ))}
        {!picker.isPending && candidates.length === 0 ? (
          <Text tone="muted">No other open reports to link to.</Text>
        ) : null}
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={2200}
        />
        {suggestedParent ? (
          <Card tone="subtle" testID="suggested-parent">
            <Text>That report is itself a duplicate. Link to its parent instead?</Text>
            <Button
              label="Link to its parent"
              size="desk"
              onPress={() => {
                setSuggested(suggestedParent);
                void submit(suggestedParent);
              }}
              testID="link-suggested"
            />
          </Card>
        ) : (
          <MutationError error={error} />
        )}
        <Button
          label="Link report"
          fullWidth
          disabled={!parentId}
          loading={pending && suggested === null}
          onPress={() => parentId && void submit(parentId)}
          testID="link-confirm"
        />
        <Button label="Cancel" variant="tertiary" size="desk" fullWidth onPress={onClose} />
      </Stack>
    </BottomSheet>
  );
}
