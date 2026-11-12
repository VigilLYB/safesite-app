import { Redirect } from "expo-router";
import { Logo, Screen, Stack, Text } from "@/components/ui";
import { LoginForm, useSession } from "@/features/auth";
import { roleHome } from "@/lib/permissions";

export default function Login() {
  const { state, user } = useSession();
  if (user) return <Redirect href={roleHome[user.role]} />;
  if (state.status === "loading") return null;
  return (
    <Screen>
      <Stack gap={5} style={{ paddingTop: 48 }}>
        <Logo size={48} />
        <Stack gap={1}>
          <Text variant="display" accessibilityRole="header">
            SafeSite
          </Text>
          <Text variant="bodyLg" tone="muted">
            Plant X hazard reporting. Sign in with your work account.
          </Text>
        </Stack>
        <LoginForm />
      </Stack>
    </Screen>
  );
}
