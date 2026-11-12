import type { Incident, TransitionEvent } from "@/lib/api";
import { canUnlinkDuplicate, isStaff } from "@/lib/permissions";
import { Button, Row, Stack, Text } from "@/components/ui";
import { useSession } from "@/features/auth";

export type DialogKind =
  | { kind: "edit" }
  | { kind: "workflow"; event: TransitionEvent }
  | { kind: "link" }
  | { kind: "unlink" }
  | { kind: "assign" };

export interface ActionBarProps {
  incident: Incident;
  busy: boolean;
  onOpen: (dialog: DialogKind) => void;
  onRunPpe: () => void;
  ppePending: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

const WORKFLOW: Record<TransitionEvent, { label: string; positive: boolean }> = {
  validate: { label: "Validate", positive: true },
  approve: { label: "Approve", positive: true },
  close: { label: "Close", positive: true },
  reopen: { label: "Reopen", positive: false },
  reject: { label: "Reject", positive: false },
};
const ORDER: readonly TransitionEvent[] = ["validate", "approve", "close", "reopen", "reject"];

/** Why an assign button is disabled for staff, or null when it should simply be hidden. */
export function assignDisabledReason(incident: Incident): string | null {
  if (incident.permissions.canAssignAction) return null;
  if (incident.status === "OPEN" || incident.status === "VALIDATED")
    return "Approve the report first";
  if (incident.status === "ACTION_ASSIGNED") return "An action is already in progress";
  return null;
}

/**
 * Guide §4.4: every button comes from the `permissions` object — the state machine is never
 * re-derived here. Staff also see two buttons disabled *with a reason*.
 */
export function ActionBar({
  incident,
  busy,
  onOpen,
  onRunPpe,
  ppePending,
  onRefresh,
  refreshing,
}: ActionBarProps) {
  const { user } = useSession();
  const staff = isStaff(user?.role);
  const p = incident.permissions;
  const assignReason = staff ? assignDisabledReason(incident) : null;
  const linkBlocked =
    staff && !p.canCluster && incident.duplicateCount > 0 && !incident.cluster.isDuplicate;
  const events = ORDER.filter((event) => p.transitions.includes(event));
  const positive = events.filter((e) => WORKFLOW[e].positive);
  const negative = events.filter((e) => !WORKFLOW[e].positive);

  return (
    <Stack gap={2}>
      <Row gap={2} wrap>
        {positive.map((event, index) => (
          <Button
            key={event}
            label={WORKFLOW[event].label}
            variant={index === 0 ? "primary" : "secondary"}
            size="desk"
            disabled={busy}
            onPress={() => onOpen({ kind: "workflow", event })}
            testID={`action-${event}`}
          />
        ))}
        {p.canAssignAction || assignReason ? (
          <Button
            label="Assign action"
            variant={positive.length === 0 && p.canAssignAction ? "primary" : "secondary"}
            size="desk"
            disabled={busy || !p.canAssignAction}
            accessibilityHint={assignReason ?? undefined}
            onPress={() => onOpen({ kind: "assign" })}
            testID="action-assign"
          />
        ) : null}
        {p.canEdit ? (
          <Button
            label="Edit"
            variant="secondary"
            size="desk"
            icon="clip"
            disabled={busy}
            onPress={() => onOpen({ kind: "edit" })}
            testID="action-edit"
          />
        ) : null}
        {p.canCluster || linkBlocked ? (
          <Button
            label={incident.cluster.isDuplicate ? "Change parent" : "Link as duplicate"}
            variant="secondary"
            size="desk"
            icon="link"
            disabled={busy || linkBlocked}
            accessibilityHint={linkBlocked ? "Unlink its duplicates first" : undefined}
            onPress={() => onOpen({ kind: "link" })}
            testID="action-link"
          />
        ) : null}
        {canUnlinkDuplicate(user?.role) && incident.cluster.isDuplicate ? (
          <Button
            label="Unlink duplicate"
            variant="secondary"
            size="desk"
            disabled={busy}
            onPress={() => onOpen({ kind: "unlink" })}
            testID="action-unlink"
          />
        ) : null}
        {p.canRunPpeScan ? (
          <Button
            label="Run PPE scan"
            variant="secondary"
            size="desk"
            icon="shield"
            loading={ppePending}
            disabled={busy}
            onPress={onRunPpe}
            testID="action-ppe"
          />
        ) : null}
        <Button
          label="Refresh"
          variant="tertiary"
          size="desk"
          icon="refresh"
          loading={refreshing}
          onPress={onRefresh}
          testID="action-refresh"
        />
      </Row>
      {negative.length > 0 ? (
        <Row gap={2} wrap>
          {negative.map((event) => (
            <Button
              key={event}
              label={WORKFLOW[event].label}
              variant="secondary"
              size="desk"
              disabled={busy}
              onPress={() => onOpen({ kind: "workflow", event })}
              testID={`action-${event}`}
            />
          ))}
        </Row>
      ) : null}
      {assignReason ? (
        <Text variant="caption" tone="muted" testID="assign-reason">
          {assignReason}
        </Text>
      ) : null}
      {linkBlocked ? (
        <Text variant="caption" tone="muted" testID="link-reason">
          This report has its own duplicates. Unlink them first.
        </Text>
      ) : null}
    </Stack>
  );
}
