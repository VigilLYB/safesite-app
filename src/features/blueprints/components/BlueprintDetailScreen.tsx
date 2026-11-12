import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { clampPoint, polygonsOverlap, type Point } from "@/lib/geometry";
import { isUuid } from "@/lib/validation";
import {
  Badge,
  Button,
  Card,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Stack,
  Text,
} from "@/components/ui";
import { DetailSkeleton, ErrorState, RecordNotFound } from "@/components/feedback";
import { isApiError } from "@/lib/api";
import { useBlueprint } from "../hooks/useBlueprints";
import { AddAreaPanel } from "./AddAreaPanel";
import { BlueprintMap } from "./BlueprintMap";

export function BlueprintDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const valid = isUuid(String(id));
  const query = useBlueprint(valid ? String(id) : undefined);
  const [drawing, setDrawing] = useState(false);
  const [draft, setDraft] = useState<Point[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const back = () => (router.canGoBack() ? router.back() : router.replace("/admin/blueprints"));
  const blueprint = query.data;

  return (
    <Screen testID="blueprint-detail">
      <ScreenHeader title={blueprint?.name ?? "Blueprint"} onBack={back} />
      {!valid ? <RecordNotFound what="blueprint" /> : null}
      {valid && query.isPending ? <DetailSkeleton /> : null}
      {valid && query.isError ? (
        isApiError(query.error) && query.error.kind === "notFound" ? (
          <RecordNotFound what="blueprint" />
        ) : (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        )
      ) : null}
      {blueprint ? (
        <Stack gap={4}>
          <Row gap={2} wrap>
            {blueprint.isDefault ? <Badge label="Default" tone="inverse" icon="check" /> : null}
            <Badge label={`${blueprint.widthPx} × ${blueprint.heightPx} px`} />
            <Badge label={blueprint.geoBounds ? "GPS bounds set" : "No GPS bounds"} />
          </Row>
          <BlueprintMap
            blueprint={blueprint}
            accessibilityLabel={`Floor plan ${blueprint.name}`}
            areas={blueprint.areas.map((area) => ({
              ...area,
              highlighted: area.id === selected,
            }))}
            draftPolygon={draft}
            onPick={
              drawing
                ? ({ x, y }) =>
                    setDraft((points) =>
                      points.length >= 100
                        ? points
                        : [...points, clampPoint(x, y, blueprint.widthPx, blueprint.heightPx)],
                    )
                : undefined
            }
            onImageError={() => void query.refetch()}
          />
          <Section title={`Areas (${blueprint.areas.length})`}>
            {blueprint.areas.length === 0 ? (
              <Text tone="muted">No areas yet. Draw one to name a part of the plant.</Text>
            ) : (
              blueprint.areas.map((area) => (
                <Card
                  key={area.id}
                  onPress={() => setSelected(area.id === selected ? null : area.id)}
                  selected={area.id === selected}
                  accessibilityLabel={`Area ${area.name}`}
                >
                  <Text variant="label">{area.name}</Text>
                  <Text variant="caption" tone="muted">
                    {area.polygon.length} corners
                  </Text>
                </Card>
              ))
            )}
          </Section>
          {drawing ? (
            <AddAreaPanel
              blueprintId={blueprint.id}
              points={draft}
              overlapsExisting={blueprint.areas.some((area) =>
                polygonsOverlap(draft, area.polygon),
              )}
              onUndo={() => setDraft((points) => points.slice(0, -1))}
              onCancel={() => {
                setDrawing(false);
                setDraft([]);
              }}
              onSaved={() => {
                setDrawing(false);
                setDraft([]);
              }}
            />
          ) : (
            <Button
              label="Add area"
              icon="plus"
              size="desk"
              onPress={() => setDrawing(true)}
              testID="add-area"
            />
          )}
        </Stack>
      ) : null}
    </Screen>
  );
}
