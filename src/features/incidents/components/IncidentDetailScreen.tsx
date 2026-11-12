import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { incidentKeys, isApiError, type Incident, type TransitionEvent } from "@/lib/api";
import { displayTitle } from "@/lib/format";
import { isStaff } from "@/lib/permissions";
import { isUuid } from "@/lib/validation";
import {
  Banner,
  DetailSkeleton,
  ErrorState,
  MutationError,
  NoteDialog,
  RecordNotFound,
  TimelineSkeleton,
} from "@/components/feedback";
import { Screen, ScreenHeader, Stack, TabStrip, type TabOption } from "@/components/ui";
import { AssignActionWizard } from "@/features/actions";
import { useSession } from "@/features/auth";
import { useIncidentChanges } from "../hooks/useIncidentChanges";
import { useRunPpeScan } from "../hooks/useIncidentMutations";
import { useIncident, useIncidentTimeline } from "../hooks/useIncidents";
import { ActionBar, type DialogKind } from "./ActionBar";
import { EditIncidentDialog } from "./EditIncidentDialog";
import { IncidentHeader } from "./IncidentHeader";
import { LinkDuplicateDialog } from "./LinkDuplicateDialog";
import { StaleVersionDialog } from "./StaleVersionDialog";
import { TimelineBar } from "./TimelineBar";
import { ActionTab } from "./tabs/ActionTab";
import { DuplicatesTab } from "./tabs/DuplicatesTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { LocationTab } from "./tabs/LocationTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { PpeTab } from "./tabs/PpeTab";
import { SimilarTab } from "./tabs/SimilarTab";

type TabKey =
  "overview" | "location" | "history" | "duplicates" | "thread" | "similar" | "action" | "ppe";

const WORKFLOW_COPY: Record<
  TransitionEvent,
  { title: string; description: string; confirm: string }
> = {
  // Not offered in the app (Approve is the one review step); kept so the map stays complete.
  validate: {
    title: "Validate report",
    description: "Mark this report as checked.",
    confirm: "Validate",
  },
  approve: {
    title: "Approve report",
    description:
      "Confirm this is a real hazard. A corrective action can be assigned whenever one is needed.",
    confirm: "Approve",
  },
  reject: {
    title: "Reject report",
    description: "Dismiss this report. The reason is recorded in its history.",
    confirm: "Reject",
  },
  reopen: {
    title: "Reopen report",
    description: "Return this report to Open. It needs approving again before a new action.",
    confirm: "Reopen",
  },
  close: { title: "Close report", description: "Close this resolved report.", confirm: "Close" },
};

function availableTabs(incident: Incident, staff: boolean): TabOption<TabKey>[] {
  const tabs: TabOption<TabKey>[] = [
    { value: "overview", label: "Overview" },
    { value: "location", label: "Location" },
    { value: "history", label: "History" },
  ];
  if (incident.duplicateCount > 0) tabs.push({ value: "duplicates", label: "Duplicates" });
  if (incident.cluster.isDuplicate) tabs.push({ value: "thread", label: "Thread" });
  if (staff) tabs.push({ value: "similar", label: "Similar" });
  tabs.push({ value: "action", label: "Action" }, { value: "ppe", label: "PPE" });
  return tabs;
}

/** Incident detail (guide §4.4): header, timeline bar, permission-driven actions, lazy tabs. */
export function IncidentDetailScreen() {
  const router = useRouter();
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const incidentId = String(id);
  const { user } = useSession();
  const valid = isUuid(incidentId);
  const query = useIncident(incidentId);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/incidents" as Href));
  const incident = query.data;

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      testID="incident-detail"
    >
      <ScreenHeader
        title={incident ? displayTitle(incident) : "Report"}
        titleTestID={incident ? "incident-title" : undefined}
        onBack={back}
        trail={[{ label: isStaff(user?.role) ? "Incidents" : "My reports", onPress: back }]}
      />
      {!valid ? <RecordNotFound what="report" /> : null}
      {valid && query.isPending ? <DetailSkeleton lines={5} /> : null}
      {valid && query.isError && !incident ? (
        isApiError(query.error) && query.error.kind === "notFound" ? (
          <RecordNotFound what="report" />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : null}
      {incident ? (
        <Loaded
          incident={incident}
          staff={isStaff(user?.role)}
          tabParam={tab}
          refreshing={query.isRefetching}
        />
      ) : null}
    </Screen>
  );
}

function Loaded({
  incident,
  staff,
  tabParam,
  refreshing,
}: {
  incident: Incident;
  staff: boolean;
  tabParam: string | undefined;
  refreshing: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const changes = useIncidentChanges(incident);
  const ppe = useRunPpeScan();
  const timeline = useIncidentTimeline(incident.id);
  const tabs = useMemo(() => availableTabs(incident, staff), [incident, staff]);
  const current: TabKey = tabs.some((t) => t.value === tabParam)
    ? (tabParam as TabKey)
    : "overview";
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [linkPreset, setLinkPreset] = useState<string | null>(null);
  const parent = useIncident(incident.cluster.parentIncidentId ?? "none");

  const setTab = (next: TabKey) =>
    router.setParams({ tab: next === "overview" ? undefined : next });
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: incidentKeys.detail(incident.id) });
  };
  const close = () => {
    setDialog(null);
    setLinkPreset(null);
    changes.clearError();
  };
  const onOutcome = (outcome: string) => {
    if (outcome !== "error") close();
  };

  return (
    <Stack gap={4}>
      <IncidentHeader
        incident={incident}
        parentTitle={parent.data ? displayTitle(parent.data) : undefined}
        onOpenDuplicates={() => setTab("duplicates")}
        onRetryTranscription={() => void changes.retryTranscription()}
        retrying={changes.retryingTranscription}
      />
      <MutationError error={changes.transcriptionError} />
      {changes.assignedActionId ? (
        <Banner
          icon="check"
          message="Action assigned."
          actionLabel="Open action"
          onAction={() => router.push(`/actions/${changes.assignedActionId}` as Href)}
          testID="assigned-banner"
        />
      ) : null}
      {timeline.isPending ? <TimelineSkeleton /> : null}
      {timeline.data ? (
        <TimelineBar
          nodes={timeline.data.nodes}
          currentVersion={incident.version}
          onSelect={(version) =>
            router.push(`/incidents/${incident.id}/versions/${version}` as Href)
          }
        />
      ) : null}
      <ActionBar
        incident={incident}
        busy={changes.busy}
        onOpen={setDialog}
        onRefresh={refreshAll}
        refreshing={refreshing}
      />
      <TabStrip label="Report sections" tabs={tabs} value={current} onChange={setTab} />

      {current === "overview" ? (
        <OverviewTab
          incident={incident}
          onRefreshMedia={refreshAll}
          onOpenLocation={() => setTab("location")}
        />
      ) : null}
      {current === "location" ? (
        <LocationTab
          incident={incident}
          error={changes.error}
          busy={changes.busy}
          onMove={(target) => changes.move(target)}
        />
      ) : null}
      {current === "history" ? <HistoryTab incidentId={incident.id} /> : null}
      {current === "duplicates" ? (
        <DuplicatesTab parentId={incident.id} mode="duplicates" currentId={incident.id} />
      ) : null}
      {current === "thread" && incident.cluster.parentIncidentId ? (
        <DuplicatesTab
          parentId={incident.cluster.parentIncidentId}
          mode="thread"
          currentId={incident.id}
        />
      ) : null}
      {current === "similar" ? (
        <SimilarTab
          incidentId={incident.id}
          canCluster={incident.permissions.canCluster}
          onLinkUnder={(parentId) => {
            setLinkPreset(parentId);
            setDialog({ kind: "link" });
          }}
        />
      ) : null}
      {current === "action" ? (
        <ActionTab incident={incident} onAssign={() => setDialog({ kind: "assign" })} />
      ) : null}
      {current === "ppe" ? (
        <PpeTab
          incident={incident}
          onRun={() => ppe.mutate(incident.id)}
          running={ppe.isPending}
          error={ppe.error}
        />
      ) : null}

      <EditIncidentDialog
        incident={incident}
        visible={dialog?.kind === "edit"}
        error={changes.error}
        pending={changes.busy}
        onSave={async (patch) => onOutcome(await changes.edit(patch))}
        onClose={close}
      />
      {dialog?.kind === "workflow" ? (
        <NoteDialog
          visible
          title={WORKFLOW_COPY[dialog.event].title}
          description={WORKFLOW_COPY[dialog.event].description}
          confirmLabel={WORKFLOW_COPY[dialog.event].confirm}
          required={dialog.event === "reject" || dialog.event === "reopen"}
          pending={changes.busy}
          error={changes.error}
          onConfirm={async (note) => onOutcome(await changes.transition(dialog.event, note))}
          onClose={close}
        />
      ) : null}
      <NoteDialog
        visible={dialog?.kind === "unlink"}
        title="Unlink duplicate"
        description="This report becomes a standalone report again."
        confirmLabel="Unlink"
        pending={changes.busy}
        error={changes.error}
        onConfirm={async (note) => onOutcome(await changes.unlink(note))}
        onClose={close}
      />
      <LinkDuplicateDialog
        incident={incident}
        visible={dialog?.kind === "link"}
        initialParentId={linkPreset}
        error={changes.error}
        pending={changes.busy}
        onLink={changes.link}
        onClose={close}
      />
      <AssignActionWizard
        visible={dialog?.kind === "assign"}
        onClose={close}
        pending={changes.busy}
        error={changes.error}
        onSubmit={async (body) => {
          const outcome = await changes.assign(body);
          return outcome === "ok" || outcome === "stale";
        }}
      />
      <StaleVersionDialog
        stale={changes.stale}
        fresh={incident}
        busy={changes.busy}
        onReview={() => {
          changes.dismissStale();
          close();
          setTab("history");
        }}
        onRetry={async () => {
          const stale = changes.stale;
          if (!stale) return;
          const outcome = await stale.retry(incident);
          if (outcome !== "stale") changes.dismissStale();
          if (outcome === "ok") close();
        }}
        onDiscard={() => {
          changes.dismissStale();
          close();
        }}
      />
    </Stack>
  );
}
