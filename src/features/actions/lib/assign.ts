import type { ActionType, AssignActionInput } from "@/lib/api";
import { addDays, plantDayStartIso, YMD } from "@/lib/plant-time";
import { LIMITS } from "@/lib/validation";

export interface MilestoneDraft {
  title: string;
  /** Plant-time day, "2026-11-20", or empty. */
  due: string;
}

export interface AssignForm {
  type: ActionType;
  templateCode: string;
  title: string;
  description: string;
  assigneeId: string;
  /** Plant-time day, or empty ("due with its last milestone"). */
  due: string;
  milestones: MilestoneDraft[];
}

export const emptyAssignForm = (): AssignForm => ({
  type: "ONE_OFF",
  templateCode: "",
  title: "",
  description: "",
  assigneeId: "",
  due: "",
  milestones: [{ title: "", due: "" }],
});

/** A due day means "by the end of that plant day": the start of the next one. */
export const dueDayToIso = (day: string): string => plantDayStartIso(addDays(day, 1));

const validDay = (value: string) => !value || (YMD.test(value) && !Number.isNaN(Date.parse(value)));

export type AssignErrors = Partial<
  Record<"templateCode" | "title" | "description" | "due" | "milestones", string>
>;

/** Client-side mirror of the server rules for POST /v1/incidents/{id}/actions (guide §4.4 e). */
export function validateAssign(form: AssignForm): AssignErrors {
  const errors: AssignErrors = {};
  const title = form.title.trim();
  if (form.type === "PREBUILT" && !form.templateCode) errors.templateCode = "Choose a template.";
  if (form.type !== "PREBUILT" && !title) errors.title = "Enter a title.";
  if (title.length > LIMITS.title)
    errors.title = `Keep the title under ${LIMITS.title} characters.`;
  if (form.description.trim().length > LIMITS.actionDescription) {
    errors.description = `Keep the description under ${LIMITS.actionDescription} characters.`;
  }
  if (!validDay(form.due)) errors.due = "Use the format YYYY-MM-DD.";
  if (form.type === "CUSTOM") {
    const rows = form.milestones;
    if (rows.length < 1 || rows.length > LIMITS.milestones) {
      errors.milestones = "Add between 1 and 20 milestones.";
    } else if (rows.some((row) => !row.title.trim() || row.title.trim().length > LIMITS.title)) {
      errors.milestones = "Every milestone needs a title of up to 200 characters.";
    } else if (rows.some((row) => !validDay(row.due))) {
      errors.milestones = "Milestone dates use the format YYYY-MM-DD.";
    }
  }
  return errors;
}

/** Warn, don't block: due dates going backwards, or already past. */
export function milestoneWarnings(milestones: readonly MilestoneDraft[], today: string): string[] {
  const dated = milestones.filter((row) => YMD.test(row.due));
  const warnings: string[] = [];
  if (dated.some((row, i) => i > 0 && row.due < (dated[i - 1] as MilestoneDraft).due)) {
    warnings.push("Some due dates go backwards.");
  }
  if (dated.some((row) => row.due < today)) warnings.push("Some due dates are in the past.");
  return warnings;
}

/**
 * Build the request body from an explicit field list. `milestones` only for CUSTOM (any other type
 * returns 400); `templateCode` only for PREBUILT (the server would ignore it); empties are omitted.
 */
export function buildAssignBody(form: AssignForm): Omit<AssignActionInput, "expectedVersion"> {
  const title = form.title.trim();
  const description = form.description.trim();
  return {
    type: form.type,
    ...(form.type === "PREBUILT" ? { templateCode: form.templateCode } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(form.assigneeId ? { assigneeId: form.assigneeId } : {}),
    ...(form.due ? { dueAt: dueDayToIso(form.due) } : {}),
    ...(form.type === "CUSTOM"
      ? {
          milestones: form.milestones.map((row) => ({
            title: row.title.trim(),
            ...(row.due ? { dueAt: dueDayToIso(row.due) } : {}),
          })),
        }
      : {}),
  };
}
