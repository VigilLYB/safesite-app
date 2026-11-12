import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { z } from "zod";
import { userMessage } from "@/lib/api";
import { useZodForm } from "@/lib/forms";
import { roleHome } from "@/lib/permissions";
import { space } from "@/lib/theme";
import { Button, Icon, Row, Stack, Text, TextField } from "@/components/ui";
import { useSession } from "../SessionProvider";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email.")
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password."),
});

export function LoginForm() {
  const router = useRouter();
  const { signIn } = useSession();
  const form = useZodForm(loginSchema, { email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const submit = async () => {
    const values = form.validate();
    if (!values || submitting) return;
    setSubmitting(true);
    setFailure(null);
    try {
      const user = await signIn(values.email, values.password);
      router.replace(roleHome[user.role]);
    } catch (error) {
      setFailure(userMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap={4}>
      <TextField
        label="Work email"
        value={form.values.email}
        onChangeText={(value) => form.set("email", value)}
        error={form.errors.email}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        testID="login-email"
      />
      <TextField
        label="Password"
        value={form.values.password}
        onChangeText={(value) => form.set("password", value)}
        error={form.errors.password}
        secureTextEntry={!reveal}
        autoComplete="current-password"
        textContentType="password"
        autoCapitalize="none"
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="login-password"
      />
      <Button
        label={reveal ? "Hide password" : "Show password"}
        variant="tertiary"
        size="desk"
        onPress={() => setReveal((value) => !value)}
      />
      {failure ? (
        <View
          style={styles.failure}
          accessible
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Row gap={2} align="flex-start">
            <Icon name="warn" size={20} />
            <Text style={styles.flex}>{failure}</Text>
          </Row>
        </View>
      ) : null}
      <Button
        label="Sign in"
        onPress={() => void submit()}
        loading={submitting}
        fullWidth
        testID="login-submit"
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  failure: { paddingVertical: space[2] },
});
