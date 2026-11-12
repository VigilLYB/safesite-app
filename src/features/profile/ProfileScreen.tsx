import Constants from "expo-constants";
import { roleLabel } from "@/lib/permissions";
import {
  Badge,
  Button,
  Card,
  KeyValue,
  Row,
  Screen,
  ScreenHeader,
  Stack,
  Text,
} from "@/components/ui";
import { useSession } from "@/features/auth";

export function ProfileScreen() {
  const { user, signOut } = useSession();
  if (!user) return null;
  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <Card>
        <Stack gap={3}>
          <Text variant="title">{user.fullName}</Text>
          <Badge label={roleLabel[user.role]} tone="inverse" icon="user" />
          <Row gap={5} wrap>
            <KeyValue label="Email" value={user.email} />
            <KeyValue label="App version" value={Constants.expoConfig?.version ?? "dev"} mono />
          </Row>
        </Stack>
      </Card>
      {/* Kept apart from navigation so it can't be hit by accident. */}
      <Stack gap={2} style={{ marginTop: 24 }}>
        <Button
          label="Sign out"
          variant="secondary"
          icon="logout"
          fullWidth
          onPress={() => void signOut()}
          testID="sign-out"
        />
      </Stack>
    </Screen>
  );
}
