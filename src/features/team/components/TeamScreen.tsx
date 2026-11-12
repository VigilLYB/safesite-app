import { useState } from "react";
import { formatDate } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import {
  Badge,
  Button,
  Card,
  Row,
  Screen,
  ScreenHeader,
  Stack,
  TabStrip,
  Text,
  TextField,
} from "@/components/ui";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/feedback";
import { useSession } from "@/features/auth";
import { useUsers } from "@/features/users";
import { filterUsers, type TeamTab } from "../lib/password";
import { AddUserDialog } from "./AddUserDialog";

const TABS = [
  { value: "all", label: "All" },
  { value: "WORKER", label: "Workers" },
  { value: "SUPERVISOR", label: "Supervisors" },
  { value: "MANAGER", label: "Managers" },
] as const;

/** Team (guide §4.10): read-only for supervisors, managers can add people. */
export function TeamScreen() {
  const { user } = useSession();
  const query = useUsers();
  const [tab, setTab] = useState<TeamTab>("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const rows = filterUsers(query.data ?? [], tab, search);

  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      testID="team-screen"
    >
      <ScreenHeader
        title="Team"
        subtitle="Active people at Plant X."
        actions={
          user?.role === "MANAGER" ? (
            <Button
              label="Add user"
              icon="plus"
              size="desk"
              onPress={() => setAdding(true)}
              testID="add-user"
            />
          ) : undefined
        }
      />
      <TabStrip label="Role" tabs={TABS} value={tab} onChange={setTab} />
      <TextField
        label="Search name or email"
        value={search}
        onChangeText={setSearch}
        testID="team-search"
      />
      {query.isPending ? <ListSkeleton rows={8} /> : null}
      {query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : null}
      {query.data && rows.length === 0 ? <EmptyState icon="users" title="Nobody matches" /> : null}
      <Stack gap={2}>
        {rows.map((person) => (
          <Card key={person.id} testID={`user-${person.email}`}>
            <Row justify="space-between" gap={2}>
              <Text variant="label">{person.fullName}</Text>
              <Badge label={roleLabel[person.role]} />
            </Row>
            <Text variant="caption" tone="muted">
              {person.email} · Member since {formatDate(person.createdAt)}
            </Text>
          </Card>
        ))}
      </Stack>
      <AddUserDialog visible={adding} onClose={() => setAdding(false)} />
    </Screen>
  );
}
