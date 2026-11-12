import { useCallback, useState } from "react";
import type { z } from "zod";

type Errors<T> = Partial<Record<keyof T, string>>;

/**
 * Small Zod-backed form state shared by every form: errors are per field, cleared when the
 * field changes, and `validate()` returns the parsed values or null.
 */
export function useZodForm<T extends Record<string, unknown>>(schema: z.ZodType<T>, initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Errors<T>>({});

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => (previous[key] ? { ...previous, [key]: undefined } : previous));
  }, []);

  const validate = useCallback((): T | null => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }
    const next: Errors<T> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof T | undefined;
      if (key !== undefined && next[key] === undefined) next[key] = issue.message;
    }
    setErrors(next);
    return null;
  }, [schema, values]);

  const reset = useCallback(() => {
    setValues(initial);
    setErrors({});
  }, [initial]);

  return { values, errors, set, validate, reset };
}
