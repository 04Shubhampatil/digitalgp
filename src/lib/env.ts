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
  /** Directory for uploaded media on the VPS disk (git-ignored). */
  UPLOADS_DIR: z.string().min(1).default("uploads"),
  /** Cloudflare Turnstile secret for public forms. Unset = CAPTCHA disabled (honeypot + timing only). */
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
  /** How long contact-form submissions are kept before the purge job deletes them. */
  FORM_SUBMISSION_RETENTION_MONTHS: z.coerce.number().int().min(1).max(60).default(12),
  /** How long a citizen's complaint attachment may stay unattached before the purge job deletes it. */
  GRIEVANCE_UPLOAD_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),
  /** Cap on unattached complaint uploads per website (bounds disk use from abusive clients). */
  GRIEVANCE_UPLOAD_MAX_PENDING: z.coerce.number().int().min(1).max(10_000).default(200),
  /** Weather provider API key (OpenWeatherMap-compatible). Unset = public weather falls back to the manual section. Never commit. */
  WEATHER_API_KEY: z.string().min(1).optional(),
  WEATHER_API_BASE_URL: z.string().url().default("https://api.openweathermap.org/data/2.5"),
  /** How long a fetched forecast is reused before the provider is called again. */
  WEATHER_CACHE_MINUTES: z.coerce.number().int().min(1).max(180).default(15),
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
