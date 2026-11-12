import { useState } from "react";
import { fieldErrors, isApiError, type Role, type User } from "@/lib/api";
import { roleLabel } from "@/lib/permissions";
import { createUserSchema, LIMITS } from "@/lib/validation";
import { BottomSheet, Button, Card, ChipGroup, Stack, Text, TextField } from "@/components/ui";
import { MutationError } from "@/components/feedback";
import { useCreateUser } from "@/features/users";
import { generatePassword } from "../lib/password";

const ROLE_OPTIONS = (["WORKER", "SUPERVISOR", "MANAGER"] as const).map((value) => ({
  value,
  label: roleLabel[value],
}));

export function AddUserDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <AddUserForm onClose={onClose} />;
}

/** Guide §4.10. The temporary password is shown once on success. */
function AddUserForm({ onClose }: { onClose: () => void }) {
  const mutation = useCreateUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("WORKER");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [created, setCreated] = useState<{ user: User; password: string } | null>(null);

  const submit = () => {
    const parsed = createUserSchema.safeParse({ email, fullName, role, password });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      return setErrors(next);
    }
    setErrors({});
    mutation.mutate(parsed.data, {
      onSuccess: (user) => setCreated({ user, password: parsed.data.password }),
      onError: (error) => {
        if (isApiError(error) && error.status === 409) {
          setErrors({ email: "This email is already in use" });
        } else {
          const server = fieldErrors(error);
          const mapped: Record<string, string> = {};
          for (const key of ["email", "fullName", "role", "password"]) {
            if (server[key]) mapped[key] = server[key];
          }
          setErrors(mapped);
        }
      },
    });
  };

  if (created) {
    return (
      <BottomSheet visible title="User added" onClose={onClose}>
        <Stack gap={4}>
          <Text>
            {created.user.fullName} ({roleLabel[created.user.role]}) can now sign in with{" "}
            {created.user.email}.
          </Text>
          <Card tone="subtle">
            <Text variant="caption" tone="muted">
              Temporary password (shown once)
            </Text>
            <Text variant="mono" selectable testID="temp-password">
              {created.password}
            </Text>
          </Card>
          <Text variant="caption" tone="muted">
            Share it securely, for example in person. There is no password reset yet.
          </Text>
          <Button label="Done" fullWidth onPress={onClose} testID="user-done" />
        </Stack>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet visible title="Add user" onClose={onClose}>
      <Stack gap={4}>
        <TextField
          label="Email"
          required
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.email}
          maxLength={LIMITS.email}
          testID="user-email"
        />
        <TextField
          label="Full name"
          required
          value={fullName}
          onChangeText={setFullName}
          error={errors.fullName}
          maxLength={LIMITS.name}
          testID="user-name"
        />
        <Stack gap={2}>
          <Text variant="label">Role</Text>
          <ChipGroup label="Role" options={ROLE_OPTIONS} value={role} onChange={setRole} />
        </Stack>
        <TextField
          label="Temporary password"
          required
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          helper="At least 10 characters."
          error={errors.password}
          maxLength={LIMITS.password}
          testID="user-password"
        />
        <Button
          label="Generate password"
          variant="secondary"
          size="desk"
          onPress={() => setPassword(generatePassword())}
          testID="user-generate"
        />
        {!Object.keys(errors).length ? <MutationError error={mutation.error} /> : null}
        <Button
          label="Add user"
          fullWidth
          loading={mutation.isPending}
          onPress={submit}
          testID="user-submit"
        />
      </Stack>
    </BottomSheet>
  );
}
