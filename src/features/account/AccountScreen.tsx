import { useRouter } from "expo-router";
import { formatDate, formatDateTime } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import { Button, Card, KeyValue, Screen, ScreenHeader, Stack } from "@/components/ui";
import { useSession } from "@/features/auth";

/** Account (guide §4.12): who you are, when the session ends, sign out. No password change exists. */
export function AccountScreen() {
  const router = useRouter();
  const { user, expiresAt, signOut } = useSession();
  if (!user) return null;
  return (
    <Screen testID="account-screen">
      <ScreenHeader title="Account" />
      <Card>
        <Stack gap={3}>
          <KeyValue label="Name" value={user.fullName} />
          <KeyValue label="Email" value={user.email} />
          <KeyValue label="Role" value={roleLabel[user.role]} />
          <KeyValue label="Member since" value={formatDate(user.createdAt)} />
          <KeyValue label="Session ends" value={formatDateTime(expiresAt)} />
        </Stack>
      </Card>
      <Button
        label="Sign out"
        icon="logout"
        variant="secondary"
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
        testID="sign-out"
      />
    </Screen>
  );
}
