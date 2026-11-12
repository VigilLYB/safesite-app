import { useRouter } from "expo-router";
import { Screen } from "@/components/ui";
import { StateLayout } from "./StateLayout";

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
      <StateLayout
        icon={icon}
        title={title}
        message={message}
        primary={{ label: actionLabel, onPress: onAction }}
        size="page"
      />
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
    <StateLayout
      icon="map"
      title={`${what[0]?.toUpperCase()}${what.slice(1)} not found or not shared with you`}
      message="It may have been removed, or it belongs to someone else."
      secondary={{
        label: "Go back",
        onPress: () => (router.canGoBack() ? router.back() : router.replace("/")),
      }}
      testID="record-not-found"
    />
  );
}
