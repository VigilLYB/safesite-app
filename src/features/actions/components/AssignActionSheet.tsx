import { useMemo } from "react";
import { z } from "zod";
import type { ActionType, Incident } from "@/lib/api";
import { clock } from "@/lib/clock";
import { useZodForm } from "@/lib/forms";
import {
  BottomSheet,
  Button,
  ChipGroup,
  SelectField,
  Stack,
  Text,
  TextField,
} from "@/components/ui";
import { InlineNotice, MutationError } from "@/components/feedback";
import { useUsers } from "@/features/users";
import { useActionTemplates, useAssignAction } from "../hooks/useActions";

const DAY_MS = 86_400_000;

const schema = z
  .object({
    type: z.enum(["PREBUILT", "ONE_OFF"]),
    templateCode: z.string(),
    title: z.string().max(200, "Keep the title under 200 characters."),
    description: z.string().max(2000, "Keep the description under 2000 characters."),
    assigneeId: z.string(),
    dueInDays: z.enum(["1", "3", "7", "14", "30"]),
  })
  .superRefine((value, ctx) => {
    if (value.type === "PREBUILT" && !value.templateCode) {
      ctx.addIssue({ code: "custom", path: ["templateCode"], message: "Choose a template." });
    }
    if (value.type === "ONE_OFF" && !value.title.trim()) {
      ctx.addIssue({ code: "custom", path: ["title"], message: "Describe what needs doing." });
    }
  });

const TYPE_OPTIONS = [
  { value: "PREBUILT", label: "From template" },
  { value: "ONE_OFF", label: "One-off task" },
] as const;

const DUE_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "30 days" },
] as const;

export interface AssignActionSheetProps {
  incident: Incident;
  visible: boolean;
  onClose: () => void;
}

export function AssignActionSheet({ incident, visible, onClose }: AssignActionSheetProps) {
  if (!visible) return null;
  return <AssignForm incident={incident} onClose={onClose} />;
}

function AssignForm({ incident, onClose }: { incident: Incident; onClose: () => void }) {
  const form = useZodForm(schema, {
    type: "PREBUILT" as Extract<ActionType, "PREBUILT" | "ONE_OFF">,
    templateCode: "",
    title: "",
    description: "",
    assigneeId: "",
    dueInDays: "7" as "1" | "3" | "7" | "14" | "30",
  });
  const templates = useActionTemplates();
  const users = useUsers();
  const mutation = useAssignAction();

  const templateOptions = useMemo(
    () =>
      (templates.data ?? []).map((template) => ({
        value: template.code,
        label: template.name,
        description: `${template.milestones.length} milestones`,
      })),
    [templates.data],
  );
  const userOptions = useMemo(
    () =>
      (users.data ?? []).map((user) => ({
        value: user.id,
        label: user.fullName,
        description: user.role.toLowerCase(),
      })),
    [users.data],
  );

  const submit = () => {
    const values = form.validate();
    if (!values) return;
    const dueAt = new Date(clock.nowMs() + Number(values.dueInDays) * DAY_MS).toISOString();
    mutation.mutate(
      {
        incidentId: incident.id,
        expectedVersion: incident.version,
        type: values.type,
        assigneeId: values.assigneeId || undefined,
        ...(values.type === "PREBUILT"
          ? { templateCode: values.templateCode }
          : {
              title: values.title.trim(),
              description: values.description.trim() || undefined,
              dueAt,
            }),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <BottomSheet visible title="Assign a corrective action" onClose={onClose}>
      <Stack gap={4}>
        <ChipGroup
          label="Action type"
          options={TYPE_OPTIONS}
          value={form.values.type}
          onChange={(value) => form.set("type", value)}
        />
        {form.values.type === "PREBUILT" ? (
          <Stack gap={2}>
            <SelectField
              label="Template"
              required
              value={form.values.templateCode || null}
              options={templateOptions}
              onChange={(value) => form.set("templateCode", value)}
              error={form.errors.templateCode}
              helper="Milestones and due dates are filled in for you."
            />
            {templates.isError ? <InlineNotice message="Couldn't load templates." /> : null}
          </Stack>
        ) : (
          <Stack gap={4}>
            <TextField
              label="What needs doing"
              required
              value={form.values.title}
              onChangeText={(v) => form.set("title", v)}
              error={form.errors.title}
            />
            <TextField
              label="Details"
              value={form.values.description}
              onChangeText={(v) => form.set("description", v)}
              error={form.errors.description}
              multiline
            />
            <Stack gap={2}>
              <Text variant="label">Due in</Text>
              <ChipGroup
                label="Due in"
                options={DUE_OPTIONS}
                value={form.values.dueInDays}
                onChange={(v) => form.set("dueInDays", v)}
              />
            </Stack>
          </Stack>
        )}
        <SelectField
          label="Assign to"
          value={form.values.assigneeId || null}
          options={userOptions}
          onChange={(value) => form.set("assigneeId", value)}
          helper="Unassigned actions stay open."
        />
        <MutationError error={mutation.error} />
        <Button label="Assign action" loading={mutation.isPending} onPress={submit} fullWidth />
      </Stack>
    </BottomSheet>
  );
}
