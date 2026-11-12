import { useMemo, type ReactElement } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import type { IncidentFilters, IncidentSummary } from "@/lib/api";
import { space } from "@/lib/theme";
import { Button } from "@/components/ui";
import { EmptyState, ErrorState, InlineNotice, ListSkeleton } from "@/components/feedback";
import { useIncidentList } from "../hooks/useIncidents";
import { IncidentCard } from "./IncidentCard";

export interface IncidentListProps {
  filters: IncidentFilters;
  onSelect: (incident: IncidentSummary) => void;
  selectedId?: string | null | undefined;
  emptyTitle?: string;
  emptyMessage?: string;
  header?: ReactElement;
}

/** Virtualised, cursor-paginated report list with consistent loading / empty / error states. */
export function IncidentList({
  filters,
  onSelect,
  selectedId,
  emptyTitle,
  emptyMessage,
  header,
}: IncidentListProps) {
  const query = useIncidentList(filters);
  const items = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const body = (() => {
    if (query.data === undefined) {
      return query.isPending ? (
        <ListSkeleton />
      ) : (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      );
    }
    return null;
  })();

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <IncidentCard incident={item} onPress={onSelect} selected={item.id === selectedId} />
      )}
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {query.isError && query.data ? (
            <InlineNotice message="Couldn't refresh. Showing the last saved list." />
          ) : null}
        </View>
      }
      ListEmptyComponent={
        body ?? (
          <EmptyState
            title={emptyTitle ?? "No reports"}
            message={emptyMessage ?? "Nothing matches these filters."}
          />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? (
          <View style={styles.footer}>
            <Button
              label="Load more"
              variant="secondary"
              size="desk"
              loading={query.isFetchingNextPage}
              onPress={() => void query.fetchNextPage()}
            />
          </View>
        ) : undefined
      }
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  content: { paddingBottom: space[6] },
  header: { gap: space[3], paddingBottom: space[3] },
  separator: { height: space[2] },
  footer: { paddingTop: space[3], alignItems: "center" },
});
