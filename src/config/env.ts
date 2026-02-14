import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url().optional(),
});

export const env = (() => {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    console.error("Invalid client environment variables:", parsed.error.flatten());
    throw new Error("Invalid client environment variables");
  }
  return parsed.data;
})();
