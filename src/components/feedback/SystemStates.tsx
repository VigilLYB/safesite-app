import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Icon, Screen, Text } from "@/components/ui";
import { space } from "@/lib/theme";

interface StateProps {
  icon: "warn" | "shield" | "map" | "wifi";
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  testID: string;
}

function StateScreen({ icon, title, message, actionLabel, onAction, testID }: StateProps) {
  return (
    <Screen testID={testID}>
      <View style={styles.box} accessibilityRole="summary">
        <Icon name={icon} size={36} />
        <Text variant="title" accessibilityRole="header">
          {title}
        </Text>
        <Text tone="muted" style={styles.center}>
          {message}
        </Text>
        <Button label={actionLabel} onPress={onAction} size="desk" />
      </View>
    </Screen>
  );
}

/** A signed-in person on a route their role can't use. Never sends them to the login page. */
export function ForbiddenScreen({ onHome }: { onHome: () => void }) {
  return (
    <StateScreen
      icon="shield"
      title="You don't have access to this page"
      message="Your role can't open this part of SafeSite. If you need it, ask your safety manager."
      actionLabel="Go to my home"
      onAction={onHome}
      testID="forbidden"
    />
  );
}

export function NotFoundScreen({ onHome }: { onHome: () => void }) {
  return (
    <StateScreen
      icon="map"
      title="Page not found"
      message="That link doesn't go anywhere in SafeSite."
      actionLabel="Go home"
      onAction={onHome}
      testID="not-found"
    />
  );
}

/** Boot `/auth/me` hit a 5xx, 429 or network error: an outage is not a logout. */
export function ServiceUnavailableScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <StateScreen
      icon="wifi"
      title="SafeSite can't be reached right now"
      message="You are still signed in. Check your connection and try again."
      actionLabel="Try again"
      onAction={onRetry}
      testID="service-unavailable"
    />
  );
}

/** Record page: the same words for "missing" and "not shared with you" (guide §2.3). */
export function RecordNotFound({ what = "report" }: { what?: string }) {
  const router = useRouter();
  return (
    <View style={styles.box} accessibilityRole="summary" testID="record-not-found">
      <Icon name="map" size={32} />
      <Text variant="heading">{`${what[0]?.toUpperCase()}${what.slice(1)} not found or not shared with you`}</Text>
      <Button
        label="Go back"
        variant="secondary"
        size="desk"
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    gap: space[3],
    paddingVertical: space[7],
    paddingHorizontal: space[4],
  },
  center: { textAlign: "center" },
});
