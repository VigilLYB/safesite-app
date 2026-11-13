import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { BottomSheet, Button, Row, Stack, Text } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { palette, radii, space } from "@/lib/theme";
import type { OutboxEntry } from "@/lib/offline/outbox";
import type { QueuedReport } from "@/features/report";
import type { SyncState } from "../hooks/useSync";

const iso = (ms: number) => new Date(ms).toISOString();

function reportTitle(report: QueuedReport): string {
  const title = report.input.title.trim() || report.input.category.trim();
  return title ? `New report: ${title}` : "New report";
}

/** Discard asks twice: a saved report or change cannot be brought back. */
function DiscardButton({ onConfirm, testID }: { onConfirm: () => void; testID: string }) {
  const [armed, setArmed] = useState(false);
  return (
    <Button
      label={armed ? "Discard for good" : "Discard"}
      variant="tertiary"
      size="desk"
      destructive
      onPress={() => (armed ? onConfirm() : setArmed(true))}
      testID={testID}
    />
  );
}

function Item({
  title,
  savedAt,
  status,
  error,
  children,
  testID,
}: {
  title: string;
  savedAt: number;
  status: "pending" | "conflict" | "failed";
  error: string | null | undefined;
  children?: React.ReactNode;
  testID: string;
}) {
  const statusText =
    status === "pending"
      ? "Waiting to send"
      : status === "conflict"
        ? "Needs your decision"
        : "Not accepted";
  return (
    <View style={styles.item} testID={testID}>
      <Stack gap={1}>
        <Text variant="label">{title}</Text>
        <Text variant="caption" tone="muted">
          {`${statusText} · saved ${formatDateTime(iso(savedAt))}`}
        </Text>
        {error ? (
          <Text variant="caption" tone="critical">
            {error}
          </Text>
        ) : null}
        {children ? (
          <Row gap={2} wrap>
            {children}
          </Row>
        ) : null}
      </Stack>
    </View>
  );
}

/** Everything saved on this device that has not reached the server yet, with what to do next. */
export function OutboxSheet({
  visible,
  onClose,
  sync,
}: {
  visible: boolean;
  onClose: () => void;
  sync: SyncState;
}) {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const open = (incidentId: string) => {
    onClose();
    router.push(`/incidents/${incidentId}` as Href);
  };
  const sendAnyway = async (entry: OutboxEntry) => {
    setProblem(await sync.sendAnyway(entry));
  };
  const empty = sync.reports.length === 0 && sync.changes.length === 0;

  return (
    <BottomSheet visible={visible} title="Saved on this device" onClose={onClose}>
      <Stack gap={3} testID="outbox-sheet">
        <Text variant="caption" tone="muted">
          These are sent automatically when you are online. Nothing here is lost if you close the
          app.
        </Text>
        {problem ? (
          <Text variant="caption" tone="critical">
            {problem}
          </Text>
        ) : null}
        {empty ? <Text>Everything has been sent.</Text> : null}

        {sync.reports.map((report) => (
          <Item
            key={report.id}
            title={reportTitle(report)}
            savedAt={report.savedAt}
            status={report.status === "failed" ? "failed" : "pending"}
            error={report.error}
            testID={`outbox-report-${report.id}`}
          >
            {report.status === "failed" ? (
              <>
                <Button
                  label="Retry"
                  variant="secondary"
                  size="desk"
                  onPress={() => void sync.retryReport(report.id)}
                  testID={`outbox-report-retry-${report.id}`}
                />
                <DiscardButton
                  onConfirm={() => void sync.discardReport(report.id)}
                  testID={`outbox-report-discard-${report.id}`}
                />
              </>
            ) : null}
          </Item>
        ))}

        {sync.changes.map((entry) => {
          const versioned =
            entry.change.kind === "incident.edit" || entry.change.kind === "incident.transition";
          return (
            <Item
              key={entry.id}
              title={entry.label}
              savedAt={entry.createdAt}
              status={entry.status}
              error={entry.error}
              testID={`outbox-change-${entry.id}`}
            >
              {entry.status === "conflict" && versioned ? (
                <Button
                  label="Send mine anyway"
                  variant="secondary"
                  size="desk"
                  onPress={() => void sendAnyway(entry)}
                  testID={`outbox-send-anyway-${entry.id}`}
                />
              ) : null}
              {entry.status === "failed" ? (
                <Button
                  label="Retry"
                  variant="secondary"
                  size="desk"
                  onPress={() => void sync.retryChange(entry.id)}
                  testID={`outbox-retry-${entry.id}`}
                />
              ) : null}
              {entry.status !== "pending" ? (
                <>
                  <Button
                    label="Open report"
                    variant="tertiary"
                    size="desk"
                    onPress={() => open(entry.change.incidentId)}
                  />
                  <DiscardButton
                    onConfirm={() => void sync.discardChange(entry.id)}
                    testID={`outbox-discard-${entry.id}`}
                  />
                </>
              ) : null}
            </Item>
          );
        })}

        {!empty && sync.waiting > 0 ? (
          <Button
            label={sync.syncing ? "Sending…" : "Send now"}
            onPress={sync.syncNow}
            loading={sync.syncing}
            testID="outbox-send-now"
          />
        ) : null}
      </Stack>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  item: {
    borderRadius: radii.card,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: palette.border,
    padding: space[3],
  },
});
