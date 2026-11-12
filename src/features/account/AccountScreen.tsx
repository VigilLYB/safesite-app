import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { formatDate, formatDateTime } from "@/lib/format";
import { roleLabel } from "@/lib/permissions";
import { palette, radii } from "@/lib/theme";
import {
  Badge,
  Button,
  Card,
  KeyValue,
  Row,
  Screen,
  ScreenHeader,
  Section,
  Stack,
  Text,
} from "@/components/ui";
import { useSession } from "@/features/auth";

/** First letter of up to the first two words, e.g. "Priya Nair" -> "PN". */
function initialsOf(fullName: string): string {
  const letters = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

/** Account (guide §4.12): who you are, when the session ends, sign out. No password change exists. */
export function AccountScreen() {
  const router = useRouter();
  const { user, expiresAt, signOut } = useSession();
  if (!user) return null;
  return (
    <Screen testID="account-screen">
      <ScreenHeader title="Account" />
      <Card>
        <Row gap={3}>
          <View style={styles.avatar}>
            <Text variant="heading" tone="inverse">
              {initialsOf(user.fullName)}
            </Text>
          </View>
          <Stack gap={1} style={styles.identity}>
            <Text variant="heading">{user.fullName}</Text>
            <Text variant="caption" tone="muted">
              {user.email}
            </Text>
          </Stack>
          <Badge label={roleLabel[user.role]} />
        </Row>
      </Card>
      <Section title="Details">
        <Card>
          <Stack gap={3}>
            <KeyValue label="Member since" value={formatDate(user.createdAt)} />
            <KeyValue label="Session ends" value={formatDateTime(expiresAt)} />
          </Stack>
        </Card>
      </Section>
      <Button
        label="Sign out"
        icon="logout"
        variant="secondary"
        destructive
        fullWidth
        onPress={() => {
          void signOut().then(() => router.replace("/login"));
        }}
        testID="sign-out"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: palette.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { flex: 1 },
});
