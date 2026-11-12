import { z } from "zod";

/** The only module that reads process.env. Expo inlines EXPO_PUBLIC_* at build time. */
const raw = {
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  APP_TIME_ZONE: process.env.EXPO_PUBLIC_APP_TIME_ZONE,
};

const schema = z.object({
  API_BASE_URL: z
    .url()
    .refine((value) => !value.endsWith("/"), "must not end with a slash")
    .refine((value) => __DEV__ || value.startsWith("https://"), "must be https in release builds"),
  APP_TIME_ZONE: z.string().min(1).default("Asia/Kolkata"),
});

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  // Name the keys, never the values.
  const keys = [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))];
  throw new Error(`Invalid SafeSite config: ${keys.join(", ")}. See .env.example.`);
}

export const config = Object.freeze(parsed.data);
