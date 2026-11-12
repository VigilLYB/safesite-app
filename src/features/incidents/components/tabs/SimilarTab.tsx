import { useState } from "react";
import { useRouter, type Href } from "expo-router";
import { displayTitle, formatSimilarity, shortId } from "@/lib/format";
import { Badge, Button, Card, Row, Stack, Text } from "@/components/ui";
import { QueryBoundary } from "@/components/feedback";
import { SeverityBadge } from "@/components/domain";
import { useSimilarIncidents } from "../../hooks/useIncidents";

export interface SimilarTabProps {
  incidentId: string;
  canCluster: boolean;
  onLinkUnder: (parentId: string) => void;
}

/** AI candidates: open, unlinked reports from the last 30 days. Show more = the 20 maximum. */
export function SimilarTab({ incidentId, canCluster, onLinkUnder }: SimilarTabProps) {
  const router = useRouter();
  const [limit, setLimit] = useState(5);
  const query = useSimilarIncidents(incidentId, limit, true);
  return (
    <QueryBoundary
      query={query}
      isEmpty={(data) => data.items.length === 0}
      empty={
        <Text tone="muted" testID="similar-empty">
          {query.data?.reason ?? "No similar reports found."}
        </Text>
      }
    >
      {(data) => (
        <Stack gap={3} testID="tab-similar">
          <Text variant="caption" tone="muted">
            Similarity scores come from AI.
          </Text>
          {data.items.map((item) => (
            <Card key={item.id} testID={`similar-${item.id}`}>
              <Row justify="space-between">
                <Text variant="mono" tone="muted">
                  {shortId(item.id)}
                </Text>
                <Badge label={`${formatSimilarity(item.similarity)} similar`} />
              </Row>
              <Text variant="label">{displayTitle(item)}</Text>
              <SeverityBadge severity={item.severity} showPips={false} />
              <Row gap={2} wrap>
                <Button
                  label="Open"
                  variant="secondary"
                  size="desk"
                  onPress={() => router.push(`/incidents/${item.id}` as Href)}
                />
                {canCluster ? (
                  <Button
                    label="Make this a duplicate of it"
                    size="desk"
                    onPress={() => onLinkUnder(item.id)}
                    testID={`link-under-${item.id}`}
                  />
                ) : null}
              </Row>
            </Card>
          ))}
          {limit < 20 && data.items.length >= limit ? (
            <Button label="Show more" variant="tertiary" size="desk" onPress={() => setLimit(20)} />
          ) : null}
        </Stack>
      )}
    </QueryBoundary>
  );
}
