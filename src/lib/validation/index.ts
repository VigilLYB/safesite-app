import { z } from "zod";

/** Mirrors the backend limits (guide §8) so most errors are caught before a request is sent. */
export const LIMITS = {
  email: 254,
  password: 200,
  title: 200,
  description: 5000,
  category: 60,
  note: 2000,
  actionDescription: 2000,
  name: 120,
  customFieldKeys: 30,
  customFieldKey: 64,
  customFieldValue: 1000,
  milestones: 20,
  polygonMin: 3,
  polygonMax: 100,
  blueprintPx: 20_000,
  cellSize: { min: 10, max: 500 },
} as const;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter your email.")
  .max(LIMITS.email)
  .pipe(z.email("Enter a valid email address."));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password.").max(LIMITS.password),
});

/** Trimmed optional text: empty becomes undefined so it is omitted from create bodies. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `Keep ${label} under ${max} characters.`)
    .transform((value) => (value === "" ? undefined : value));

export const reportDetailsSchema = z.object({
  title: optionalText(LIMITS.title, "the title"),
  description: optionalText(LIMITS.description, "the description"),
  category: optionalText(LIMITS.category, "the category"),
});

export const noteSchema = (required: boolean) =>
  z
    .string()
    .trim()
    .max(LIMITS.note, `Keep the note under ${LIMITS.note} characters.`)
    .refine((value) => !required || value.length > 0, "A reason is required.");

export const createUserSchema = z.object({
  email,
  fullName: z.string().trim().min(1, "Enter a name.").max(LIMITS.name),
  role: z.enum(["WORKER", "SUPERVISOR", "MANAGER"]),
  password: z
    .string()
    .min(10, "Use at least 10 characters.")
    .max(LIMITS.password, "Use at most 200 characters."),
});

export const geoBoundsFormSchema = z
  .object({
    north: z.number().min(-90).max(90),
    south: z.number().min(-90).max(90),
    east: z.number().min(-180).max(180),
    west: z.number().min(-180).max(180),
  })
  .refine((b) => b.north > b.south, "North must be greater than south.")
  .refine((b) => b.east > b.west, "East must be greater than west.");

export const blueprintFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(LIMITS.name),
  widthPx: z.number().int().min(1).max(LIMITS.blueprintPx),
  heightPx: z.number().int().min(1).max(LIMITS.blueprintPx),
});

export const areaFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(LIMITS.name),
});

export const isUuid = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const isPositiveInt = (value: string): boolean => /^[1-9]\d*$/.test(value);
