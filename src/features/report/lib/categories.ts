import type { SelectOption } from "@/components/ui";

/** The dropdown's choices. "Other" opens a text box: the API accepts any category up to 60 chars. */
export const CATEGORIES = [
  "Chemical leak",
  "Fire risk",
  "Slip or trip",
  "Missing PPE",
  "Electrical",
  "Equipment fault",
  "Confined space",
  "Other",
] as const;

export const CATEGORY_OPTIONS: readonly SelectOption<string>[] = CATEGORIES.map((value) => ({
  value,
  label: value,
}));

export const OTHER_CATEGORY = "Other";

/** True for a category picked from the list (anything else came from the "Other" text box). */
export const isListedCategory = (value: string): boolean =>
  value !== OTHER_CATEGORY && (CATEGORIES as readonly string[]).includes(value);
