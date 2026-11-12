import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ACTIVE_ACTION_STATUSES, type ActionFilters } from "@/lib/api";
import { space } from "@/lib/theme";
import { ChipGroup, Screen, ScreenHeader } from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { useActions } from "../hooks/useActions";
import { ActionCard } from "./ActionCard";

type ActionView = "active" | "overdue" | "done";

const OPTIONS = [
  { value: "active", label: "Active" },
  { value: "overdue", label: "Overdue" },
  { value: "done", label: "Done" },
] as const;

const FILTERS: Record<ActionView, ActionFilters> = {
  active: { status: ACTIVE_ACTION_STATUSES.join(","), limit: 50 },
  overdue: { overdue: true, limit: 50 },
  done: { status: "DONE", limit: 50 },
};

export interface ActionsScreenProps {
  onOpenIncident: (incidentId: string) => void;
}

/** Action tracking dashboard for supervisors and managers. */
export function ActionsScreen({ onOpenIncident }: ActionsScreenProps) {
  const [view, setView] = useState<ActionView>("active");
  const query = useActions(FILTERS[view]);

  return (
    <Screen scroll={false}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ActionCard action={item} onOpenIncident={onOpenIncident} />}
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader title="Actions" subtitle="Corrective actions and their milestones" />
            <ChipGroup label="Filter actions" options={OPTIONS} value={view} onChange={setView} />
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <ListSkeleton />
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ) : (
            <EmptyState
              icon="tasks"
              title="No actions here"
              message="Approved reports get actions assigned from their detail page."
            />
          )
        }
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        contentContainerStyle={styles.content}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space[6] },
  header: { gap: space[3], paddingBottom: space[4] },
  gap: { height: space[3] },
});
