import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import type { IncidentSummary } from "@/lib/api";
import { Button, Row, Screen, ScreenHeader, Stack, TabStrip } from "@/components/ui";
import { EmptyState, ErrorState, InlineNotice, ListSkeleton } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { useIncidentList } from "../hooks/useIncidents";
import {
  hasActiveFilters,
  parseListParams,
  tabsFor,
  toApiFilters,
  toUrlParams,
  type ListState,
} from "../lib/list-params";
import { IncidentCard } from "./IncidentCard";
import { IncidentFilterPanel } from "./IncidentFilterPanel";

const TRIAGE_POLL_MS = 60_000;

/** My reports (worker) or Incidents (staff). Guide §4.3. */
export function IncidentsScreen() {
  const router = useRouter();
  const { user } = useSession();
  const params = useLocalSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const role = user?.role ?? "WORKER";
  const staff = role !== "WORKER";

  const state = useMemo(() => parseListParams(params as never, role), [params, role]);
  const filters = useMemo(() => toApiFilters(state, role), [state, role]);
  const query = useIncidentList(filters, state.tab === "triage" ? { pollMs: TRIAGE_POLL_MS } : {});

  // Reset the cursor with every filter change (the query key changes) and de-duplicate by id.
  const rows = useMemo(() => {
    const seen = new Set<string>();
    const out: IncidentSummary[] = [];
    for (const page of query.data?.pages ?? []) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push(item);
        }
      }
    }
    return out;
  }, [query.data]);

  const update = (patch: Partial<ListState>) =>
    router.setParams(toUrlParams({ ...state, ...patch }, role));
  const clear = () => router.setParams(toUrlParams({ tab: state.tab }, role));
  const open = (item: IncidentSummary) => router.push(`/incidents/${item.id}` as Href);

  const loadMoreFailed = query.isFetchNextPageError;
  const filtered = hasActiveFilters(state);

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      testID="incidents-screen"
    >
      <ScreenHeader title={staff ? "Incidents" : "My reports"} />
      <TabStrip
        label="Report status"
        tabs={tabsFor(role).map((t) => ({ value: t.value, label: t.label }))}
        value={state.tab}
        onChange={(tab) => update({ tab })}
      />
      <Row gap={2}>
        <Button
          label={showFilters ? "Hide filters" : "Filters"}
          icon="filter"
          variant="secondary"
          size="desk"
          onPress={() => setShowFilters((value) => !value)}
          testID="toggle-filters"
        />
        <Button
          label="Refresh"
          icon="refresh"
          variant="tertiary"
          size="desk"
          onPress={() => void query.refetch()}
        />
        {filtered ? (
          <Button label="Clear filters" variant="tertiary" size="desk" onPress={clear} />
        ) : null}
      </Row>
      {showFilters ? (
        <IncidentFilterPanel role={role} state={state} onChange={update} onClear={clear} />
      ) : null}

      {query.isPending ? <ListSkeleton rows={8} /> : null}
      {query.isError && rows.length === 0 && !query.isPending ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.isError && rows.length > 0 && !loadMoreFailed ? (
        <InlineNotice message="Couldn't refresh. Showing the last loaded reports." />
      ) : null}
      {!query.isPending && !query.isError && rows.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No reports match these filters"
            actionLabel="Clear filters"
            onAction={clear}
          />
        ) : (
          <EmptyState
            title={
              !staff && state.tab === "active"
                ? "You haven't reported anything yet"
                : state.tab === "triage"
                  ? "No new incidents"
                  : "No reports here"
            }
            actionLabel={!staff && state.tab === "active" ? "Report a hazard" : undefined}
            onAction={() => router.push("/report" as Href)}
          />
        )
      ) : null}
      {rows.length > 0 ? (
        <Stack gap={3}>
          {rows.map((item) => (
            <IncidentCard
              key={item.id}
              incident={item}
              onPress={open}
              showReporter={staff}
              onOpenParent={staff ? undefined : (id) => router.push(`/incidents/${id}` as Href)}
            />
          ))}
          {loadMoreFailed ? (
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
