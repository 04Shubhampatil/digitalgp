import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  /** Base host for subdomain tenant resolution, e.g. "digitalgp.in". */
  APP_BASE_HOST: z.string().min(1).default("localhost"),
  /** Public origin of the admin app; used for CSRF origin checks and reset links. */
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  /** Cookie name for the admin session. */
  SESSION_COOKIE_NAME: z.string().min(1).default("dgp_session"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validated process environment. Fails fast with a readable message when misconfigured. */
export function getEnv(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Invalid environment configuration: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export const isProduction = () => getEnv().NODE_ENV === "production";
