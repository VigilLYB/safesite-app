import { useMemo, useState } from "react";
import type { ActionType, AssignActionInput } from "@/lib/api";
import { clock } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { actionTypeLabel } from "@/lib/labels";
import { addDays, plantDay } from "@/lib/plant-time";
import { LIMITS } from "@/lib/validation";
import {
  BottomSheet,
  Button,
  Card,
  ChipGroup,
  SelectField,
  Stack,
  Text,
  TextField,
} from "@/components/ui";
import { InlineNotice, MutationError } from "@/components/feedback";
import { UserPicker } from "@/features/users";
import { useActionTemplates } from "../hooks/useActions";
import {
  buildAssignBody,
  emptyAssignForm,
  validateAssign,
  type AssignErrors,
  type AssignForm,
} from "../lib/assign";
import { MilestoneEditor } from "./MilestoneEditor";

type Step = "type" | "content" | "details" | "confirm";
const STEPS: readonly Step[] = ["type", "content", "details", "confirm"];

const TYPE_OPTIONS: readonly { value: ActionType; label: string }[] = [
  { value: "ONE_OFF", label: actionTypeLabel.ONE_OFF },
  { value: "PREBUILT", label: actionTypeLabel.PREBUILT },
  { value: "CUSTOM", label: actionTypeLabel.CUSTOM },
];

export interface AssignActionWizardProps {
  visible: boolean;
  onClose: () => void;
  /** Sends the body with the incident's expectedVersion. Resolves true when the action was created. */
  onSubmit: (body: Omit<AssignActionInput, "expectedVersion">) => Promise<boolean>;
  pending: boolean;
  error: unknown;
}

export function AssignActionWizard({ visible, ...rest }: AssignActionWizardProps) {
  if (!visible) return null;
  return <Wizard {...rest} />;
}

function Wizard({ onClose, onSubmit, pending, error }: Omit<AssignActionWizardProps, "visible">) {
  const [form, setForm] = useState<AssignForm>(emptyAssignForm);
  const [step, setStep] = useState<Step>("type");
  const [errors, setErrors] = useState<AssignErrors>({});
  const templates = useActionTemplates();
  const today = plantDay(clock.now());
  const patch = (changes: Partial<AssignForm>) =>
    setForm((previous) => ({ ...previous, ...changes }));

  const template = templates.data?.find((t) => t.code === form.templateCode);
  const templateOptions = useMemo(
    () =>
      (templates.data ?? []).map((t) => ({
        value: t.code,
        label: t.name,
        description: `${t.milestones.length} milestones`,
      })),
    [templates.data],
  );

  const index = STEPS.indexOf(step);
  const goNext = () => {
    const found = validateAssign(form);
    // Only the fields on the step being left block progress.
    const relevant: Partial<Record<keyof AssignErrors, string | undefined>> =
      step === "content"
        ? { templateCode: found.templateCode, title: found.title, milestones: found.milestones }
        : step === "details"
          ? { description: found.description, due: found.due }
          : {};
    const clean = Object.fromEntries(Object.entries(relevant).filter(([, v]) => v)) as AssignErrors;
    setErrors(clean);
    if (Object.keys(clean).length === 0) setStep(STEPS[index + 1] as Step);
  };

  const confirm = async () => {
    const found = validateAssign(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const ok = await onSubmit(buildAssignBody(form));
    if (ok) onClose();
  };

  return (
    <BottomSheet visible title="Assign a corrective action" onClose={onClose}>
      <Stack gap={4}>
        <Text variant="caption" tone="muted">
          Step {index + 1} of {STEPS.length}
        </Text>

        {step === "type" ? (
          <ChipGroup
            label="Action type"
            options={TYPE_OPTIONS}
            value={form.type}
            onChange={(type) => patch({ type, title: "", templateCode: "" })}
          />
        ) : null}

        {step === "content" && form.type === "PREBUILT" ? (
          <Stack gap={3}>
            <SelectField
              label="Template"
              required
              value={form.templateCode || null}
              options={templateOptions}
              onChange={(templateCode) => patch({ templateCode })}
              error={errors.templateCode}
              testID="template-select"
            />
            {templates.isError ? <InlineNotice message="Couldn't load templates." /> : null}
            {template ? (
              <Card tone="subtle">
                <Text variant="label">Milestones</Text>
                {template.milestones.map((m, i) => (
                  <Text key={i} variant="caption">
                    {i + 1}. {m.title} · due{" "}
                    {formatDate(addDays(today, m.offsetDays) + "T12:00:00Z")}
                  </Text>
                ))}
              </Card>
            ) : null}
            <TextField
              label="Title (optional)"
              helper="Defaults to the template name."
              value={form.title}
              onChangeText={(title) => patch({ title })}
              maxLength={LIMITS.title}
              error={errors.title}
            />
          </Stack>
        ) : null}

        {step === "content" && form.type !== "PREBUILT" ? (
          <Stack gap={3}>
            <TextField
              label="Title"
              required
              value={form.title}
              onChangeText={(title) => patch({ title })}
              maxLength={LIMITS.title}
              error={errors.title}
              testID="assign-title"
            />
            {form.type === "CUSTOM" ? (
              <MilestoneEditor
                rows={form.milestones}
                onChange={(milestones) => patch({ milestones })}
                today={today}
                error={errors.milestones}
              />
            ) : null}
          </Stack>
        ) : null}

        {step === "details" ? (
          <Stack gap={3}>
            <TextField
              label="Description (optional)"
              value={form.description}
              onChangeText={(description) => patch({ description })}
              multiline
              error={errors.description}
            />
            <UserPicker
              label="Assign to"
              anyLabel="Unassigned"
              excludeRoles={["MANAGER"]}
              value={form.assigneeId || null}
              onChange={(id) => patch({ assigneeId: id ?? "" })}
              helper="Unassigned actions stay open."
              testID="assign-assignee"
            />
            <TextField
              label="Due date (optional)"
              helper="When empty, the action is due with its last milestone."
              value={form.due}
              placeholder="YYYY-MM-DD"
              onChangeText={(due) => patch({ due })}
              maxLength={10}
              error={errors.due}
              testID="assign-due"
            />
          </Stack>
        ) : null}

        {step === "confirm" ? (
          <Card tone="subtle" testID="assign-summary">
            <Text variant="label">{actionTypeLabel[form.type]}</Text>
            <Text>{form.title.trim() || template?.name || "—"}</Text>
            <Text variant="caption" tone="muted">
              {form.assigneeId ? "Assigned" : "Unassigned"}
              {form.due ? ` · due ${form.due}` : ""}
            </Text>
          </Card>
        ) : null}

        <MutationError error={error} />
        {step === "confirm" ? (
          <Button
            label="Assign action"
            fullWidth
            loading={pending}
            onPress={() => void confirm()}
            testID="assign-confirm"
          />
        ) : (
          <Button label="Next" fullWidth onPress={goNext} testID="assign-next" />
        )}
        {index > 0 ? (
          <Button
            label="Back"
            variant="tertiary"
            size="desk"
            fullWidth
            onPress={() => setStep(STEPS[index - 1] as Step)}
          />
        ) : null}
      </Stack>
    </BottomSheet>
  );
}
