import { useState } from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { userMessage, isApiError } from "@/lib/api";
import { useZodForm } from "@/lib/forms";
import { homeFor } from "@/lib/routes";
import { safeNext } from "@/lib/safe-next";
import { loginSchema } from "@/lib/validation";
import { Button, Stack, TextField } from "@/components/ui";
import { FieldNotice } from "@/components/feedback";
import { useSession } from "../SessionProvider";

/** Guide §4.1: 401 is wrong credentials; 429/5xx/network is "can't reach", never a credentials error. */
function failureMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.kind === "unauthorized") return "Invalid email or password";
    if (error.kind === "validation") return "Check your email and password and try again.";
    return "Can't reach SafeSite right now. Try again.";
  }
  return userMessage(error);
}

export function LoginForm() {
  const router = useRouter();
  const { next } = useLocalSearchParams<{ next?: string }>();
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
      router.replace(safeNext(next, homeFor(user.role)) as Href);
    } catch (error) {
      setFailure(failureMessage(error));
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
        autoComplete="username"
        textContentType="username"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={254}
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
        maxLength={200}
        testID="login-password"
      />
      <Button
        label={reveal ? "Hide password" : "Show password"}
        variant="tertiary"
        size="desk"
        onPress={() => setReveal((value) => !value)}
      />
      <FieldNotice message={failure} />
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
