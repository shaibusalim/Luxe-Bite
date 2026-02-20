import { z } from "zod";
import "dotenv/config";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16),
  ADMIN_EMAIL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  PAYSTACK_SECRET_KEY: z.string().min(10).optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().optional(),
  RATE_LIMIT_MAX: z.coerce.number().optional(),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().optional(),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().optional(),
  
  // JWT Configuration
  JWT_EXPIRES_IN: z.string().optional(),
  
  // Password Security
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).optional(),
  
  // Login Security
  MAX_LOGIN_ATTEMPTS: z.coerce.number().min(3).max(10).optional(),
  LOGIN_BLOCK_DURATION_MS: z.coerce.number().min(60000).optional(),
  
  // File Upload Security
  MAX_FILE_SIZE_MB: z.coerce.number().min(1).max(50).optional(),
  ALLOWED_FILE_TYPES: z.string().optional(),
  
  // Security Headers
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
});

export const config = (() => {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid server environment variables:", parsed.error.flatten());
    throw new Error("Invalid server environment variables");
  }
  return parsed.data;
})();
