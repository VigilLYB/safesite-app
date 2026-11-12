import type { SelectOption } from "@/components/ui";

/** Suggestions only: the API accepts any category up to 60 characters. */
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
