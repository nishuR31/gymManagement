import { z } from "zod";

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env from the root project folder
config({ path: path.resolve(__dirname, "../../../../.env") });
config({ path: path.resolve(__dirname, "../../.env") });
config();

process.loadEnvFile?.();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean)
          .every((origin) => z.string().url().safeParse(origin).success),
      "CORS_ORIGIN must be a URL or comma-separated list of URLs"
    )
    .default("http://localhost:5173"),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  API_PORT: z.coerce.number().int().positive().default(4000),
  PASSKEY_EXPECTED_ORIGIN: z.string().url().default("http://localhost:5173"),
  PASSKEY_RP_ID: z.string().default("valor-fitness.vercel.app"),
  PASSKEY_RP_NAME: z.string().default("ValorFitness")
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse(source);
}
