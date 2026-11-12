import { Redirect, useLocalSearchParams, type Href } from "expo-router";
import { Banner } from "@/components/feedback";
import { Logo, Screen, Stack, Text } from "@/components/ui";
import { LoginForm, useSession } from "@/features/auth";
import { useBreakpoint } from "@/lib/responsive";
import { homeFor } from "@/lib/routes";
import { safeNext } from "@/lib/safe-next";

const REASONS = {
  expired: "Your session ended. Sign in again.",
  disabled: "This account has been disabled",
} as const;

export default function Login() {
  const { state, user } = useSession();
  const { isTablet } = useBreakpoint();
  const params = useLocalSearchParams<{ next?: string; reason?: string }>();
  if (user) return <Redirect href={safeNext(params.next, homeFor(user.role, !isTablet)) as Href} />;
  if (state.status === "loading") return null;
  const reason =
    state.status === "signedOut" && state.reason
      ? state.reason
      : params.reason === "expired" || params.reason === "disabled"
        ? params.reason
        : null;
  return (
    <Screen>
      <Stack gap={5} style={{ paddingTop: 48, maxWidth: 480, width: "100%", alignSelf: "center" }}>
        <Logo size={48} />
        <Stack gap={1}>
          <Text variant="display" accessibilityRole="header">
            SafeSite
          </Text>
          <Text variant="bodyLg" tone="muted">
            Plant X hazard reporting. Sign in with your work account.
          </Text>
        </Stack>
        {reason ? <Banner message={REASONS[reason]} testID="login-reason" /> : null}
        <LoginForm />
        <Text variant="caption" tone="muted">
          Need an account or a new password? Ask your safety manager.
        </Text>
      </Stack>
    </Screen>
  );
}
