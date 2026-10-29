import { getEnv } from "@/lib/env";
import { Errors } from "@/lib/errors";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * CAPTCHA for public forms (Cloudflare Turnstile). Enabled when TURNSTILE_SECRET_KEY is set;
 * otherwise only the honeypot and the rate limit protect the form (see features/forms/service.ts).
 * The secret is read from the environment only and never logged.
 */
export async function verifyCaptcha(token: string | undefined, ip: string | null): Promise<void> {
  const secret = getEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return;
  if (!token) throw Errors.badRequest("Please complete the security check");

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  let ok = false;
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    ok = data.success === true;
  } catch {
    ok = false;
  }
  if (!ok) throw Errors.badRequest("The security check failed. Please try again.");
}
