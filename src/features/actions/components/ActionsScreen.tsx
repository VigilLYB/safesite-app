import { useMemo } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { Action } from "@/lib/api";
import { isStaff } from "@/lib/permissions";
import { Button, Row, Screen, ScreenHeader, Stack, TabStrip } from "@/components/ui";
import { EmptyState, ErrorState, InlineNotice, ListSkeleton } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { UserPicker } from "@/features/users";
import { useActionList } from "../hooks/useActions";
import {
  actionTabsFor,
  parseActionParams,
  toActionFilters,
  type ActionListState,
} from "../lib/list-params";
import { ActionCard } from "./ActionCard";

const EMPTY_COPY: Record<string, string> = {
  mine: "Nothing assigned to you",
  overdue: "No overdue actions",
  done: "No completed actions yet",
};

/** Actions dashboard (guide §4.6): everyone tracks actions to closure. */
export function ActionsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams();
  const role = user?.role ?? "WORKER";
  const state = useMemo(() => parseActionParams(params as never, role), [params, role]);
  const filters = useMemo(() => toActionFilters(state, role), [state, role]);
  const query = useActionList(filters);

  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: Action[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
    }
    return out;
  }, [query.data]);

  const set = (patch: Partial<ActionListState>) => {
    const next = { ...state, ...patch };
    router.setParams({
      tab: next.tab === (isStaff(role) ? "active" : "mine") ? undefined : next.tab,
      assigneeId: next.assigneeId,
      incidentId: next.incidentId,
    });
  };

  const staff = isStaff(role);
  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      testID="actions-screen"
    >
      <ScreenHeader title="Actions" subtitle="Corrective actions, tracked to closure." />
      <TabStrip
        label="Action filter"
        tabs={actionTabsFor(role).map((t) => ({ value: t.value, label: t.label }))}
        value={state.tab}
        onChange={(tab) => set({ tab })}
      />
      {staff ? (
        <UserPicker
          label="Assignee"
          anyLabel="Anyone"
          value={state.assigneeId ?? null}
          onChange={(id) => set({ assigneeId: id ?? undefined })}
          helper={state.tab === "mine" ? "Not used on “Assigned to me”." : undefined}
          testID="action-assignee"
        />
      ) : null}
      {state.incidentId ? (
        <Row gap={2}>
          <InlineNotice message="Showing actions for one report." />
          <Button
            label="Clear"
            variant="tertiary"
            size="desk"
            onPress={() => set({ incidentId: undefined })}
          />
        </Row>
      ) : null}

      {query.isPending ? <ListSkeleton rows={6} /> : null}
      {query.isError && rows.length === 0 && !query.isPending ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isError && rows.length > 0 && !query.isFetchNextPageError ? (
        <InlineNotice message="Couldn't refresh. Showing the last loaded actions." />
      ) : null}
      {!query.isPending && !query.isError && rows.length === 0 ? (
        <EmptyState icon="tasks" title={EMPTY_COPY[state.tab] ?? "No actions here"} />
      ) : null}
      {rows.length > 0 ? (
        <Stack gap={3}>
          {rows.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onPress={(item) => router.push(`/actions/${item.id}` as Href)}
              onOpenIncident={(id) => router.push(`/incidents/${id}` as Href)}
            />
          ))}
          {query.isFetchNextPageError ? (
            <Button
              label="Couldn't load more. Retry"
              variant="secondary"
              size="desk"
              onPress={() => void query.fetchNextPage()}
            />
          ) : query.hasNextPage ? (
            <Button
              label="Load more"
              variant="secondary"
              size="desk"
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
              testID="load-more"
            />
          ) : null}
        </Stack>
      ) : null}
    </Screen>
  );
}
