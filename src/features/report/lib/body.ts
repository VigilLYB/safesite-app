import type { CustomFields, Severity, SubmitIncidentInput } from "@/lib/api";
import { compactCustomFields } from "@/features/incidents";

export interface ReportInput {
  clientSubmissionId: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  pin: { blueprintId: string; x: number; y: number } | null;
  gps: { lat: number; lng: number; accuracyM?: number | undefined } | null;
  custom: CustomFields;
  /** When the person tapped Send (device clock). Lets the server show when a hazard was seen. */
  capturedAt?: string | undefined;
  photoKey?: string | undefined;
  audioKey?: string | undefined;
}

/** At least one of photo, voice note, title or description (the server enforces the same rule). */
export function hasContent(input: {
  hasPhoto: boolean;
  hasVoice: boolean;
  title: string;
  description: string;
}): boolean {
  return (
    input.hasPhoto || input.hasVoice || input.title.trim() !== "" || input.description.trim() !== ""
  );
}

/**
 * Guide §4.2 "How location is built": GPS only -> `{ gps }`; a pin (with or without GPS) ->
 * `{ blueprintId, pin, gps? }` (the pin wins, GPS is stored alongside); neither -> omit.
 * Empty optionals are omitted, never sent as "" or null.
 */
export function buildLocation(
  pin: ReportInput["pin"],
  gps: ReportInput["gps"],
): SubmitIncidentInput["location"] {
  const gpsPart = gps
    ? {
        gps: {
          lat: gps.lat,
          lng: gps.lng,
          ...(gps.accuracyM !== undefined ? { accuracyM: gps.accuracyM } : {}),
        },
      }
    : {};
  if (pin) return { blueprintId: pin.blueprintId, pin: { x: pin.x, y: pin.y }, ...gpsPart };
  return gps ? gpsPart : undefined;
}

/** Built from an explicit field list: nothing from form state is ever spread into the request. */
export function buildSubmitBody(input: ReportInput): SubmitIncidentInput {
  const category = input.category.trim();
  const title = input.title.trim();
  const description = input.description.trim();
  const location = buildLocation(input.pin, input.gps);
  const customFields = compactCustomFields(input.custom);
  return {
    clientSubmissionId: input.clientSubmissionId,
    severity: input.severity,
    ...(category ? { category } : {}),
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(input.photoKey ? { photoKey: input.photoKey } : {}),
    ...(input.audioKey ? { audioKey: input.audioKey } : {}),
    ...(location ? { location } : {}),
    ...(customFields ? { customFields } : {}),
    ...(input.capturedAt ? { capturedAt: input.capturedAt } : {}),
  };
}
