import { useRouter, type Href } from "expo-router";
import { formatDate } from "@/lib/format";
import { Badge, Button, Card, Row, Screen, ScreenHeader, Stack, Text } from "@/components/ui";
import { EmptyState, ListSkeleton, QueryBoundary } from "@/components/feedback";
import { useBlueprints } from "../hooks/useBlueprints";

export function BlueprintListScreen() {
  const router = useRouter();
  const query = useBlueprints();
  return (
    <Screen
      onRefresh={() => void query.refetch()}
      refreshing={query.isRefetching}
      testID="blueprints-screen"
    >
      <ScreenHeader
        title="Blueprints"
        subtitle="Floor plans the plant uses for pins, areas and the heatmap."
        actions={
          <Button
            label="New blueprint"
            size="desk"
            onPress={() => router.push("/admin/blueprints/new" as Href)}
            testID="new-blueprint"
          />
        }
      />
      <QueryBoundary
        query={query}
        skeleton={<ListSkeleton rows={4} />}
        isEmpty={(items) => items.length === 0}
        empty={
          <EmptyState
            icon="map"
            title="No blueprints yet"
            message="Add a floor plan so reports can be pinned."
          />
        }
      >
        {(items) => (
          <Stack gap={3}>
            {items.map((blueprint) => (
              <Card
                key={blueprint.id}
                onPress={() => router.push(`/admin/blueprints/${blueprint.id}` as Href)}
                accessibilityLabel={`Open ${blueprint.name}`}
                testID={`blueprint-${blueprint.id}`}
              >
                <Row justify="space-between">
                  <Text variant="heading">{blueprint.name}</Text>
                  {blueprint.isDefault ? (
                    <Badge label="Default" tone="inverse" icon="check" />
                  ) : null}
                </Row>
                <Text variant="caption" tone="muted">
                  {blueprint.widthPx} × {blueprint.heightPx} px ·{" "}
                  {blueprint.imageUrl ? "Image added" : "No image"} ·{" "}
                  {blueprint.geoBounds ? "GPS bounds set" : "No GPS bounds"} · Created{" "}
                  {formatDate(blueprint.createdAt)}
                </Text>
              </Card>
            ))}
          </Stack>
        )}
      </QueryBoundary>
    </Screen>
  );
}
